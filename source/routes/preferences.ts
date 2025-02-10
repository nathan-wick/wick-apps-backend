import Preferences, { PreferencesInput } from '../database-models/preferences';
import { Request, Response, Router } from 'express';
import { RequestValidationOutput } from '../interfaces/request-validation-output';
import runRequest from '../utilities/run-request';
import throwError from '../utilities/throw-error';

const preferencesRoute = Router();

preferencesRoute.put(`/`, async (request: Request, response: Response) => {
	await runRequest(
		{
			request,
			response,
		},
		{
			sessionTokenIsRequired: true,
		},
		async (requestValidationOutput: RequestValidationOutput) => {
			const { ...updateData }: PreferencesInput = request.body;
			if (!requestValidationOutput.userId) {
				throwError(400, `User ID is required.`);
			}
			const preferences = await Preferences.findByPk(
				requestValidationOutput.userId,
			);
			if (!preferences) {
				throwError(404, `Could not find preferences.`);
			}
			return await preferences!.update(updateData);
		},
	);
});

export default preferencesRoute;
