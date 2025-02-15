import { type Request, type Response } from 'express';
import User, { type UserInput } from '../../database-models/user.js';
import type { RequestValidationOutput } from '../../interfaces/authentication/request-validation-output.js';
import runRequest from '../../utilities/run-request.js';
import { smallFileBytes } from '../../constants/file-sizes.js';
import throwError from '../../utilities/throw-error.js';
import { userRoute } from '../routes.js';

userRoute.put(`/`, async (request: Request, response: Response) => {
	await runRequest(
		{
			request,
			response,
		},
		{
			sessionTokenIsRequired: true,
		},
		async (requestValidationOutput: RequestValidationOutput) => {
			const { email, ...updateData }: UserInput = request.body;
			if (!requestValidationOutput.userId) {
				throwError(400, `ID is required.`);
			}
			const user = await User.findByPk(requestValidationOutput.userId);
			if (!user) {
				throwError(404, `User not found.`);
			}
			if (email && email !== user!.email) {
				throwError(400, `Email cannot be changed.`);
			}
			// TODO Replace with an accurate way to check picture size
			if (
				updateData.picture &&
				updateData.picture.length > smallFileBytes
			) {
				throwError(400, `Picture is too large.`);
			}
			const updatedUser = await user!.update(updateData);
			return updatedUser;
		},
	);
});
