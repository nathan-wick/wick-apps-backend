import type { HttpStatus } from '../interfaces/http-status.js';
import type { Response } from 'express';

const sendErrorResponse = (response: Response, error: HttpStatus) => {
	if (!response.headersSent) {
		response
			.status(error.code ?? 500)
			.send({ message: error.message ?? `Unexpected error.` });
	}
};

export default sendErrorResponse;
