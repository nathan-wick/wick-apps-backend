/* eslint-disable no-console */
import { BaseController } from '../controllers/base';
import { DashboardConfigurationController } from '../controllers/dashboard-configuration';
import type { HttpStatus } from '../interfaces/http-status';
import { PreferencesController } from '../controllers/preferences';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index';
import { Sequelize } from 'sequelize';
import { SessionController } from '../controllers/session';
import { UserController } from '../controllers/user';
import cors from 'cors';
import express from 'express';
import { initializeDashboardConfigurationModel } from '../models/dashboard-configuration';
import { initializePreferencesModel } from '../models/preferences';
import { initializeSessionModel } from '../models/session';
import { initializeUserModel } from '../models/user';
import { largeFileBytes } from '../constants/file-sizes';
import { mainRouter } from '../constants/main-router';
import nodemailer from 'nodemailer';
import { rateLimiter } from '../constants/rate-limiter';
import sendErrorResponse from './send-error-response';
import { sessionTokenValidator } from '../constants/session-token-validator';

export interface ApplicationConfiguration {
	name: string;
	database: { uri: string };
	port: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	controllers: BaseController<any>[];
	email: {
		host: string;
		port: number;
		fromAddress: string;
		password: string;
	};
	cors: {
		optionsSuccessStatus: number;
		origin: boolean;
	};
}

export let applicationConfiguration: ApplicationConfiguration;
export let database: Sequelize;
export let emailTransporter: nodemailer.Transporter<
	SMTPTransport.SentMessageInfo,
	SMTPTransport.Options
>;

export class Application {
	public express: express.Application;
	private configuration: ApplicationConfiguration;

	constructor(configuration: ApplicationConfiguration) {
		this.express = express();
		this.configuration = configuration;
		this.initializeGlobalVariables();
	}

	public async start() {
		try {
			console.log(`Starting application...`);
			this.initializeModels();
			this.initializeControllers();
			await this.initializeDatabase();
			this.initializeExpress();
			console.log(`Application started.`);
		} catch (error) {
			console.error(`Application failed.`, error);
		}
	}

	private initializeGlobalVariables() {
		applicationConfiguration = this.configuration;
		database = new Sequelize(this.configuration.database.uri, {
			define: {
				freezeTableName: true,
			},
			logging: false,
		});
		emailTransporter = nodemailer.createTransport({
			auth: {
				pass: this.configuration.email.password,
				user: this.configuration.email.fromAddress,
			},
			host: this.configuration.email.host,
			port: this.configuration.email.port,
			secure: this.configuration.email.port === 465,
		});
	}

	private initializeModels() {
		initializeDashboardConfigurationModel(database);
		initializePreferencesModel(database);
		initializeSessionModel(database);
		initializeUserModel(database);
	}

	private initializeControllers() {
		new DashboardConfigurationController();
		new PreferencesController();
		new SessionController();
		new UserController();
	}

	private async initializeDatabase() {
		await database.sync({ alter: true });
	}

	private async initializeExpress() {
		this.express.use(cors(this.configuration.cors));
		this.express.use(express.json({ limit: largeFileBytes }));
		this.express.use(
			express.urlencoded({
				extended: true,
				limit: largeFileBytes,
			}),
		);
		this.express.use(rateLimiter.middleware());
		this.express.use(sessionTokenValidator.middleware());
		this.express.use(mainRouter);
		this.express.use(
			(request: express.Request, response: express.Response) => {
				const error: HttpStatus = {
					code: 404,
					message: `The resource you are looking for could not be found.`,
				};
				sendErrorResponse(response, error);
			},
		);
		this.express.disable(`x-powered-by`);
		this.express.listen(this.configuration.port);
	}
}
