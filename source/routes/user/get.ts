import { type Request, type Response } from 'express';
import Preferences from '../../database-models/preferences.js';
import type { RequestValidationOutput } from '../../interfaces/request-validation-output.js';
import User from '../../database-models/user.js';
import runRequest from '../../utilities/run-request.js';
import throwError from '../../utilities/throw-error.js';
import { userRoute } from "../routes.js";

userRoute.get(`/`, async (request: Request, response: Response) => {
	await runRequest(
		{
			request,
			response,
		},
		{
			sessionTokenIsRequired: true,
		},
		async (requestValidationOutput: RequestValidationOutput) => {
			const user = await User.findByPk(requestValidationOutput.userId, {
				include: [
					{
						as: `preferences`,
						model: Preferences,
						required: false,
					},
				],
			});
			if (!user) {
				throwError(404, `User not found.`);
			}
			return user!;
		},
	);
});