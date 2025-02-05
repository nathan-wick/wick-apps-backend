import { Application, json, Request, Response, Router, urlencoded, } from "express";
import { HttpStatus, } from "../interfaces/http-status";
import { Sequelize, } from "sequelize";
import * as cors from "cors";
import { largeFileBytes, } from "../constants/file-sizes";
import { rateLimiter, } from "../constants/rate-limiter";
import sendErrorResponse from "./send-error-response";

const startApplication = async (
    sequelize: Sequelize,
    application: Application,
    port: number,
    routes: Router,
) => {
    try {
        // TODO Find a better way to do database updates
        await sequelize.sync({alter: true,});

        const corsOptions = {
            optionsSuccessStatus: 200,
            // TODO Look into verifying domains
            origin: true,
        };

        application.use(cors(corsOptions));

        application.use(json({limit: largeFileBytes,}));
        application.use(urlencoded({
            extended: true,
            limit: largeFileBytes,
        }));
        
        application.use(routes);
        application.use((request: Request, response: Response) => {
            const error: HttpStatus = {
                code: 404,
                message: `The resource you are looking for could not be found.`,
            };
            sendErrorResponse(response, error);
        });

        application.disable(`x-powered-by`);
        
        application.listen(port, () => {
            // eslint-disable-next-line no-console
            console.log(`Application is running on http://localhost:${port}/`);
        });

        rateLimiter.startCleanupInterval();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to start the application:`, error);
    }
};

export default startApplication;