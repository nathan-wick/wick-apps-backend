import type { ApplicationConfiguration } from '../../source/utilities/application';

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
	name: `TestApp`,
	port: 3000,
};
