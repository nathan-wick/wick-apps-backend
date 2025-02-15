import type { HttpStatus } from '../interfaces/http-status.js';
import { applicationConfiguration } from '../start-application.js';
import cors from 'cors';
import createMainRouter from './create-main-router.js';
import express from 'express';
import { largeFileBytes } from '../constants/file-sizes.js';
import sendErrorResponse from './send-error-response.js';

const corsOptions = {
	optionsSuccessStatus: 200,
	// TODO Look into verifying domains
	origin: true,
};

const createApplication = () => {
	const mainRouter = createMainRouter();
	const application: express.Application = express();

	application.use(cors(corsOptions));
	application.use(express.json({ limit: largeFileBytes }));
	application.use(
		express.urlencoded({
			extended: true,
			limit: largeFileBytes,
		}),
	);
	application.use(mainRouter);
	application.use((request: express.Request, response: express.Response) => {
		const error: HttpStatus = {
			code: 404,
			message: `The resource you are looking for could not be found.`,
		};
		sendErrorResponse(response, error);
	});
	application.disable(`x-powered-by`);
	application.listen(applicationConfiguration.port, () => {
		if (applicationConfiguration.launchMode === `development`) {
			// eslint-disable-next-line no-console
			console.log(
				`Application is running on port ${applicationConfiguration.port}`,
			);
		}
	});
};

export default createApplication;
