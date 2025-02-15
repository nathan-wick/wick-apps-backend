import type { HttpStatus } from '../interfaces/http-status.js';
import { applicationConfiguration } from '../start-application.js';

const throwError = (code: number, message: string) => {
	const error: HttpStatus = {
		code,
		message,
	};
	if (applicationConfiguration.launchMode === `development`) {
		// eslint-disable-next-line no-console
		console.error(error);
	}

	throw error;
};

export default throwError;
