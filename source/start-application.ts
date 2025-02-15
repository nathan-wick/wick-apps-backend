import type { ApplicationConfiguration } from './interfaces/application-configuration.js';
import createApplication from './utilities/create-application.js';
import initializeDatabase from './utilities/initialize-database.js';
import { rateLimiter } from './constants/rate-limiter.js';

export let applicationConfiguration: ApplicationConfiguration;

export const startApplication = async (
	applicationConfigurationInput: ApplicationConfiguration,
) => {
	try {
		applicationConfiguration = applicationConfigurationInput;
		await initializeDatabase();
		createApplication();
		rateLimiter.startCleanupInterval();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Failed to start the application:`, error);
	}
};
