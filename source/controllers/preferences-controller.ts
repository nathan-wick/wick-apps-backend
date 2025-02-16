import Preferences, {
	type PreferencesInput,
} from '../database-models/preferences.js';
import { type Request, type Response } from 'express';
import type { RequestValidationOutput } from '../interfaces/authentication/request-validation-output.js';
import runRequest from '../utilities/run-request.js';
import throwError from '../utilities/throw-error.js';

export class preferencesController {
	static async put(request: Request, response: Response) {
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
	}
}
