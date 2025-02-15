import { type Request, type Response } from 'express';
import { Op } from 'sequelize';
import Session from '../../database-models/session.js';
import type { SignInInput } from '../../interfaces/sign-in-input.js';
import { applicationKey } from '../../constants/application-key.js';
import { authenticationRoute } from '../routes.js';
import codeSessionToken from '../../utilities/code-session-token.js';
import isHashMatch from '../../utilities/is-hash-match.js';
import runRequest from '../../utilities/run-request.js';
import throwError from '../../utilities/throw-error.js';

const expireExcessSessions = async (userId: number) => {
	const now = new Date();
	const activeSessions = await Session.findAll({
		order: [[`started`, `DESC`]],
		where: {
			expires: {
				[Op.gt]: now,
			},
			successfulAttempts: {
				[Op.gt]: 0,
			},
			userId,
		},
	});

	if (activeSessions.length > 3) {
		const excessSessions = activeSessions.slice(3);

		await Promise.all(
			excessSessions.map(async (excessSession) => {
				excessSession.expires = now;
				await excessSession.save();
			}),
		);
	}
};

authenticationRoute.post(
	`/sign-in`,
	async (request: Request, response: Response) => {
		await runRequest(
			{
				request,
				response,
			},
			{
				sessionTokenIsRequired: false,
			},
			async () => {
				const { sessionId, code }: SignInInput = request.body;
				if (!sessionId) {
					throwError(400, `Session ID is required.`);
				}
				if (!code) {
					throwError(400, `Code is required.`);
				}
				const session = await Session.findByPk(sessionId);
				if (!session) {
					throwError(404, `Session not found.`);
				}
				if (session!.successfulAttempts > 0) {
					throwError(400, `Session already used.`);
				}
				const codeIsValid = await isHashMatch(code, session!.code);
				if (!codeIsValid) {
					if (session!.failedAttempts > 1) {
						throwError(429, `Too many failed attempts.`);
						// TODO Ban the requesting user. On the front-end, redirect to the email input.
					}
					await session!.update({
						failedAttempts: session!.failedAttempts + 1,
					});
					throwError(400, `Incorrect code.`);
				}
				await session!.update({
					successfulAttempts: session!.successfulAttempts + 1,
				});
				expireExcessSessions(session!.userId);
				const sessionToken = codeSessionToken(
					{ sessionId: session!.id },
					applicationKey,
				);
				return { sessionToken };
			},
		);
	},
);
