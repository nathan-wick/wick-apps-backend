import * as express from "express";
import { Sequelize, } from "sequelize";
import createApplication from "./utilities/create-application";
import createMainRouter from "./utilities/create-main-router";
import initializeDatabase from "./utilities/initialize-database";
import { rateLimiter, } from "./constants/rate-limiter";

const startApplication = async (
    sequelize: Sequelize,
    port: number,
    routers: {url: string, router: express.Router}[],
) => {
    try {
        const mainRouter = createMainRouter(routers);
        createApplication(port, mainRouter);
        await initializeDatabase(sequelize);
        rateLimiter.startCleanupInterval();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to start the application:`, error);
    }
};

export default startApplication;