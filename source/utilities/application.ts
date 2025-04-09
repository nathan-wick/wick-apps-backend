/* eslint-disable no-console */
import DashboardConfigurationModel, {
	initializeDashboardConfigurationModel,
} from '../models/dashboard-configuration';
import PreferencesModel, {
	initializePreferencesModel,
} from '../models/preferences';
import SessionModel, { initializeSessionModel } from '../models/session';
import UserModel, { initializeUserModel } from '../models/user';
import { BaseController } from '../controllers/base';
import { DashboardConfigurationController } from '../controllers/dashboard-configuration';
import type { HttpStatus } from '../interfaces/http-status';
import { PreferencesController } from '../controllers/preferences';
import RateLimiter from './rate-limiter';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index';
import { Sequelize } from 'sequelize';
import { SessionController } from '../controllers/session';
import { UserController } from '../controllers/user';
import cors from 'cors';
import express from 'express';
import { largeFileBytes } from '../constants/file-sizes';
import { mainRouter } from '../constants/main-router';
import nodemailer from 'nodemailer';
import sendErrorResponse from './send-error-response';
import { sessionTokenValidator } from '../constants/session-token-validator';

export interface ApplicationConfiguration {
	controllers: BaseController<any>[];
	cors: {
		optionsSuccessStatus: number;
		origin: boolean;
	};
	database: { uri: string };
	email: {
		host: string;
		port: number;
		fromAddress: string;
		password: string;
	};
	enableRateLimiter: boolean;
	name: string;
	port: number | null;
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
	private rateLimiter: RateLimiter;
	private server?: ReturnType<typeof this.express.listen>;

	constructor(configuration: ApplicationConfiguration) {
		this.express = express();
		this.configuration = configuration;
		this.rateLimiter = new RateLimiter();
	}

	public async start() {
		try {
			console.log(`Starting application...`);
			this.initializeGlobalVariables();
			this.initializeModels();
			this.initializeAssociations();
			this.initializeControllers();
			await this.initializeDatabase();
			if (this.configuration.enableRateLimiter) {
				this.rateLimiter.startOpenHandles();
			}
			this.initializeExpress();
			console.log(`Application started.`);
		} catch (error) {
			console.error(`Error while starting the application.`, error);
		}
	}

	public async stop() {
		try {
			console.log(`Stopping application...`);
			await database.close();
			if (this.configuration.enableRateLimiter) {
				this.rateLimiter.stopOpenHandles();
			}
			this.server?.close();
			console.log(`Application stopped.`);
		} catch (error) {
			console.error(`Error while stopping the application.`, error);
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
		if (this.configuration.enableRateLimiter) {
			this.express.use(this.rateLimiter.middleware());
		}
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
		if (this.configuration.port) {
			this.server = this.express.listen(this.configuration.port);
		}
	}

	private initializeAssociations() {
		DashboardConfigurationModel.belongsTo(UserModel, {
			as: `user`,
			foreignKey: `userId`,
		});
		PreferencesModel.belongsTo(UserModel, {
			as: `user`,
			foreignKey: `userId`,
		});
		SessionModel.belongsTo(UserModel, {
			as: `user`,
			foreignKey: `userId`,
		});
		UserModel.hasMany(SessionModel, {
			as: `sessions`,
			foreignKey: `userId`,
			onDelete: `CASCADE`,
		});
		UserModel.hasOne(PreferencesModel, {
			as: `preferences`,
			foreignKey: `userId`,
			onDelete: `CASCADE`,
		});
		UserModel.hasMany(DashboardConfigurationModel, {
			as: `dashboardConfigurations`,
			foreignKey: `userId`,
			onDelete: `CASCADE`,
		});
	}
}
