import type { Request, Response } from 'express';
import type { CallSecurityOptions } from '../interfaces/call-security-options.js';
import type { HttpStatus } from '../interfaces/http-status.js';
import type { RequestValidationOutput } from '../interfaces/request-validation-output.js';
import sendErrorResponse from './send-error-response.js';
import validateRequest from './validate-request.js';

const runRequest = async (
	call: {
		request: Request;
		response: Response;
	},
	security: CallSecurityOptions,
	service: (
		requestValidationOutput: RequestValidationOutput,
	) => Promise<unknown>,
) => {
	const { request, response } = call;

	try {
		const requestValidationOutput: RequestValidationOutput =
			await validateRequest(request, security);

		// eslint-disable-next-line no-console
		console.log({
			date: new Date().toLocaleString(`en-US`, { timeZone: `UTC` }),
			endpoint: `${request.baseUrl}${request.url}`,
			userId: requestValidationOutput.userId,
		});

		const result = await service(requestValidationOutput);

		return result
			? response.status(200).send(result)
			: response.status(200).send();
	} catch (error) {
		return sendErrorResponse(response, error as HttpStatus);
	}
};

export default runRequest;
