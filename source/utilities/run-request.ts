import { Request, Response } from 'express';
import { CallSecurityOptions } from '../interfaces/call-security-options';
import { HttpStatus } from '../interfaces/http-status';
import { RequestValidationOutput } from '../interfaces/request-validation-output';
import sendErrorResponse from './send-error-response';
import validateRequest from './validate-request';

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
