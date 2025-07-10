import {
	ApplicationConfiguration,
	defaultRateLimiterOptions,
} from '../../source';

export const testApplicationConfiguration: ApplicationConfiguration = {
	controllers: [],
	cors: {
		optionsSuccessStatus: 200,
		origin: true,
	},
	database: { uri: `sqlite::memory:` },
	email: {
		fromAddress: `test@wickapps.com`,
		host: `smtp.wickapps.com`,
		password: `password`,
		port: 587,
	},
	enableRateLimiter: true,
	loggingOptions: {
		application: false,
		requests: false,
		responses: true,
	},
	name: `Test App`,
	port: null,
	rateLimiterOptions: defaultRateLimiterOptions,
};
