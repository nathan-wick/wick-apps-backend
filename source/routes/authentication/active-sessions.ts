import { type Request, type Response } from 'express';
import Session, { type SessionOutput } from '../../database-models/session.js';
import { Op } from 'sequelize';
import type { RequestValidationOutput } from '../../interfaces/authentication/request-validation-output.js';
import { authenticationRoute } from '../routes.js';
import runRequest from '../../utilities/run-request.js';
import throwError from '../../utilities/throw-error.js';

authenticationRoute.get(
	`/active-sessions`,
	async (request: Request, response: Response) => {
		await runRequest(
			{
				request,
				response,
			},
			{
				sessionTokenIsRequired: true,
			},
			async (requestValidationOutput: RequestValidationOutput) => {
				if (!requestValidationOutput.userId) {
					throwError(400, `User ID is required.`);
				}
				const activeSessions: SessionOutput[] = await Session.findAll({
					order: [[`started`, `DESC`]],
					where: {
						expires: {
							[Op.gt]: new Date(),
						},
						successfulAttempts: {
							[Op.gt]: 0,
						},
						userId: requestValidationOutput.userId,
					},
				});
				return { activeSessions };
			},
		);
	},
);
