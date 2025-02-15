import type { ApplicationConfiguration } from './interfaces/application-configuration.js';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { Sequelize } from 'sequelize';
import createApplication from './utilities/create-application.js';
import initializeDatabase from './utilities/initialize-database.js';
import nodemailer from 'nodemailer';
import { rateLimiter } from './constants/rate-limiter.js';

export let applicationConfiguration: ApplicationConfiguration;
export let database: Sequelize;
export let emailTransporter: nodemailer.Transporter<
	SMTPTransport.SentMessageInfo,
	SMTPTransport.Options
>;

export const startApplication = async (
	applicationConfigurationInput: ApplicationConfiguration,
) => {
	try {
		applicationConfiguration = applicationConfigurationInput;
		database = new Sequelize(applicationConfiguration.database.uri, {
			define: {
				freezeTableName: true,
			},
			logging: applicationConfiguration.launchMode === `development`,
		});
		emailTransporter = nodemailer.createTransport({
			auth: {
				pass: applicationConfiguration.email.password,
				user: applicationConfiguration.email.fromAddress,
			},
			host: applicationConfiguration.email.host,
			port: applicationConfiguration.email.port,
			secure: applicationConfiguration.email.port === 465,
		});
		await initializeDatabase();
		createApplication();
		rateLimiter.startCleanupInterval();
	} catch (error) {
		if (applicationConfiguration.launchMode === `development`) {
			// eslint-disable-next-line no-console
			console.error(`Failed to start the application:`, error);
		}
	}
};
