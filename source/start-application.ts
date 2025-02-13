import * as express from 'express';
import { Sequelize } from 'sequelize';
import createApplication from './utilities/create-application.js';
import createMainRouter from './utilities/create-main-router.js';
import initializeDatabase from './utilities/initialize-database.js';
import { rateLimiter } from './constants/rate-limiter.js';

export const startApplication = async (
	sequelize: Sequelize,
	port: number,
	routers: { url: string; router: express.Router }[],
) => {
	try {
		await initializeDatabase(sequelize);
		const mainRouter = createMainRouter(routers);
		createApplication(port, mainRouter);
		rateLimiter.startCleanupInterval();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Failed to start the application:`, error);
	}
};
