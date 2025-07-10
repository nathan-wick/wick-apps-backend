import DashboardConfigurationModel, {
	initializeDashboardConfigurationModel,
} from '../models/dashboard-configuration';
import PreferencesModel, {
	initializePreferencesModel,
} from '../models/preferences';
import RateLimiter, { RateLimiterOptions } from './rate-limiter';
import SessionModel, { initializeSessionModel } from '../models/session';
import UserModel, { initializeUserModel } from '../models/user';
import express, {
	type NextFunction,
	type Request,
	type Response,
} from 'express';
import { BaseController } from '../controllers/base';
import { DashboardConfigurationController } from '../controllers/dashboard-configuration';
import type { HttpStatus } from '../interfaces/http-status';
import { PreferencesController } from '../controllers/preferences';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index';
import { Sequelize } from 'sequelize';
import { SessionController } from '../controllers/session';
import { UserController } from '../controllers/user';
import cors from 'cors';
import { largeFileBytes } from '../constants/file-sizes';
import { mainRouter } from '../constants/main-router';
import nodemailer from 'nodemailer';
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
	rateLimiterOptions?: RateLimiterOptions;
	loggingOptions?: {
		application: boolean;
		requests: boolean;
		responses: boolean;
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
	private rateLimiter: RateLimiter;
	private server?: ReturnType<typeof this.express.listen>;

	constructor(configuration: ApplicationConfiguration) {
		this.express = express();
		this.configuration = configuration;
		this.rateLimiter = new RateLimiter(
			this.configuration.rateLimiterOptions,
		);
	}

	public async start() {
		if (this.configuration.loggingOptions?.application) {
			console.log(`(application)`, `Starting the application.`);
		}
		try {
			this.initializeGlobalVariables();
			this.initializeModels();
			this.initializeAssociations();
			this.initializeControllers();
			await this.initializeDatabase();
			if (this.configuration.enableRateLimiter) {
				this.rateLimiter.startOpenHandles();
			}
			this.initializeExpress();
		} catch (error) {
			console.error(`Error while starting the application.`, error);
		}
	}

	public async stop() {
		if (this.configuration.loggingOptions?.application) {
			console.log(`(application)`, `Stopping the application.`);
		}
		try {
			await database.close();
			if (this.configuration.enableRateLimiter) {
				this.rateLimiter.stopOpenHandles();
			}
			this.server?.close();
			if (this.configuration.loggingOptions?.application) {
				console.log(`(application)`, `Stopped the application.`);
			}
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
		mainRouter.get(
			`/test`,
			(request: express.Request, response: express.Response) => {
				response.send({ success: true });
			},
		);
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
		if (this.configuration.loggingOptions?.requests) {
			this.express.use(
				(request: Request, response: Response, next: NextFunction) => {
					console.log(`(request)`, {
						body: request.body,
						method: request.method,
						params: request.params,
						path: request.path,
						query: request.query,
						timestamp: new Date().toISOString(),
					});
					next();
				},
			);
		}
		this.express.use(mainRouter);
		this.express.use(
			(request: express.Request, response: express.Response) => {
				const error: HttpStatus = {
					code: 404,
					message: `The resource you are looking for could not be found.`,
				};
				response.status(error.code).send({ message: error.message });
			},
		);
		this.express.use(this.handleError);
		this.express.disable(`x-powered-by`);
		if (this.configuration.port) {
			this.server = this.express.listen(this.configuration.port, () => {
				if (this.configuration.loggingOptions?.application) {
					console.log(
						`(application)`,
						`Started the application on port ${this.configuration.port}.`,
					);
				}
			});
		}
	}

	private initializeAssociations() {
		DashboardConfigurationModel.belongsTo(UserModel, {
			as: `user`,
			foreignKey: `userId`,
			onDelete: `CASCADE`,
		});
		PreferencesModel.belongsTo(UserModel, {
			as: `user`,
			foreignKey: `userId`,
			onDelete: `CASCADE`,
		});
		SessionModel.belongsTo(UserModel, {
			as: `user`,
			foreignKey: `userId`,
			onDelete: `CASCADE`,
		});
		UserModel.hasMany(SessionModel, {
			as: `sessions`,
			foreignKey: `userId`,
		});
		UserModel.hasOne(PreferencesModel, {
			as: `preferences`,
			foreignKey: `userId`,
		});
		UserModel.hasMany(DashboardConfigurationModel, {
			as: `dashboardConfigurations`,
			foreignKey: `userId`,
		});
	}

	private handleError(
		err: any,
		req: Request,
		res: Response,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		next: NextFunction,
	) {
		res.status(err.code ?? 500).send({
			message: err.message ?? `Unexpected error.`,
		});
	}
}
