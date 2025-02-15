import { type Request, type Response } from 'express';
import type { SendVerificationEmailInput } from '../../interfaces/send-verification-email-input.js';
import Session from '../../database-models/session.js';
import User from '../../database-models/user.js';
import { authenticationRoute } from '../routes.js';
import generateRandomCode from '../../utilities/generate-random-code.js';
import getLocationFromIp from '../../utilities/get-location-from-ip.js';
import hash from '../../utilities/hash.js';
import runRequest from '../../utilities/run-request.js';
import simplifyUserAgent from '../../utilities/simplify-user-agent.js';
import throwError from '../../utilities/throw-error.js';
import validateEmail from '../../utilities/validate-email.js';

authenticationRoute.post(
	`/send-verification-email`,
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
				const { email }: SendVerificationEmailInput = request.body;
				const device = simplifyUserAgent(request.get(`User-Agent`));
				const location = getLocationFromIp(request.ip);
				if (!email) {
					throwError(400, `Email is required.`);
				}
				validateEmail(email);
				const user =
					(await User.findOne({ where: { email } })) ??
					(await User.create({ email }));
				const code = generateRandomCode();
				const now = new Date();
				const oneMonthFromNow = new Date(
					new Date().setTime(
						new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
					),
				);
				const session = await Session.create({
					code: await hash(String(code)),
					device,
					expires: oneMonthFromNow,
					failedAttempts: 0,
					location,
					started: now,
					successfulAttempts: 0,
					userId: user.id,
				});
				// TODO Send email.
				// eslint-disable-next-line no-console
				console.log(`Code: ${code}`);
				return { sessionId: session.id };
			},
		);
	},
);
