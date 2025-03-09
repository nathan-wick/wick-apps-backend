/* eslint-disable no-console */
import { BaseController } from '../controllers/base.js';
import { DashboardConfigurationController } from '../controllers/dashboard-configuration.js';
import type { HttpStatus } from '../interfaces/http-status.js';
import { PreferencesController } from '../controllers/preferences.js';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { Sequelize } from 'sequelize';
import { SessionController } from '../controllers/session.js';
import { UserController } from '../controllers/user.js';
import cors from 'cors';
import express from 'express';
import { initializeDashboardConfigurationModel } from '../models/dashboard-configuration.js';
import { initializePreferencesModel } from '../models/preferences.js';
import { initializeSessionModel } from '../models/session.js';
import { initializeUserModel } from '../models/user.js';
import { largeFileBytes } from '../constants/file-sizes.js';
import { mainRouter } from '../constants/main-router.js';
import nodemailer from 'nodemailer';
import { rateLimiter } from '../constants/rate-limiter.js';
import sendErrorResponse from './send-error-response.js';
import { sessionTokenValidator } from '../constants/session-token-validator.js';

interface ApplicationConfiguration {
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
		// TODO Verify certain domains
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
	private configuration: ApplicationConfiguration;

	constructor(configuration: ApplicationConfiguration) {
		this.configuration = configuration;
		applicationConfiguration = configuration;
		database = new Sequelize(configuration.database.uri, {
			define: {
				freezeTableName: true,
			},
			logging: false,
		});
		emailTransporter = nodemailer.createTransport({
			auth: {
				pass: configuration.email.password,
				user: configuration.email.fromAddress,
			},
			host: configuration.email.host,
			port: configuration.email.port,
			secure: configuration.email.port === 465,
		});
		this.initializeModels();
		this.initializeControllers();
	}

	public async start() {
		try {
			console.log(`Starting application...`);
			await database.sync({ alter: true });
			const application: express.Application = express();
			application.use(cors(this.configuration.cors));
			application.use(express.json({ limit: largeFileBytes }));
			application.use(
				express.urlencoded({
					extended: true,
					limit: largeFileBytes,
				}),
			);
			application.use(rateLimiter.middleware());
			application.use(sessionTokenValidator.middleware());
			application.use(mainRouter);
			application.use(
				(request: express.Request, response: express.Response) => {
					const error: HttpStatus = {
						code: 404,
						message: `The resource you are looking for could not be found.`,
					};
					sendErrorResponse(response, error);
				},
			);
			// TODO Create error handler
			application.disable(`x-powered-by`);
			application.listen(this.configuration.port, () => {
				console.log(`Application started.`);
			});
		} catch (error) {
			console.error(`Application failed to start.`);
		}
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
}
