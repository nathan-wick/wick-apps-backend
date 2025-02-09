import * as cors from "cors";
import * as express from "express";
import { HttpStatus, } from "../interfaces/http-status";
import { largeFileBytes, } from "../constants/file-sizes";
import sendErrorResponse from "./send-error-response";

const corsOptions = {
    optionsSuccessStatus: 200,
    // TODO Look into verifying domains
    origin: true,
};

const createApplication = (port: number, mainRouter: express.Router) => {
    const application: express.Application = express();

    application.use(cors(corsOptions));
    application.use(express.json({limit: largeFileBytes,}));
    application.use(express.urlencoded({
        extended: true,
        limit: largeFileBytes,
    }));
    application.use(mainRouter);
    application.use((request: express.Request, response: express.Response) => {
        const error: HttpStatus = {
            code: 404,
            message: `The resource you are looking for could not be found.`,
        };
        sendErrorResponse(response, error);
    });
    application.disable(`x-powered-by`);
    application.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Application is running on port ${port}`);
    });
};

export default createApplication;