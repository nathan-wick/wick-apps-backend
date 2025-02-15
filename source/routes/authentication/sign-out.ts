import { type Request, type Response } from 'express';
import Session from '../../database-models/session.js';
import { applicationKey } from '../../constants/application-key.js';
import { authenticationRoute } from '../routes.js';
import decodeSessionToken from '../../utilities/decode-session-token.js';
import runRequest from '../../utilities/run-request.js';

authenticationRoute.post(
	`/sign-out`,
	async (request: Request, response: Response) => {
		await runRequest(
			{
				request,
				response,
			},
			{
				sessionTokenIsRequired: true,
			},
			async () => {
				const codedSessionToken = String(
					request.header(`Session-Token`),
				);
				const decodedSessionToken = decodeSessionToken(
					codedSessionToken,
					applicationKey,
				);
				const session = await Session.findByPk(
					decodedSessionToken.sessionId,
				);
				if (session) {
					session.expires = new Date();
					await session.save();
				}
			},
		);
	},
);
