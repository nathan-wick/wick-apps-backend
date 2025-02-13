import type { HttpStatus } from '../interfaces/http-status.js';

const throwError = (code: number, message: string) => {
	const error: HttpStatus = {
		code,
		message,
	};
	// eslint-disable-next-line no-console
	console.error(error);
	throw error;
};

export default throwError;
