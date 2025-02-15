import { type Request, type Response } from 'express';
import type { SendVerificationEmailInput } from '../../interfaces/authentication/send-verification-email-input.js';
import Session from '../../database-models/session.js';
import User from '../../database-models/user.js';
import { applicationConfiguration } from '../../start-application.js';
import { authenticationRoute } from '../routes.js';
import generateRandomCode from '../../utilities/generate-random-code.js';
import getLocationFromIp from '../../utilities/get-location-from-ip.js';
import hash from '../../utilities/hash.js';
import runRequest from '../../utilities/run-request.js';
import { sendEmail } from '../../utilities/send-email.js';
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
				// TODO Create a way for users to report fraud.
				await sendEmail({
					subject: `${applicationConfiguration.name} Verification Code`,
					text: `${code} is your verification code to sign into ${applicationConfiguration.name}.\n
					\n
					Never share this code with anyone, including our support team.\n
					We will never ask for this code via phone, email, or chat.`,
					to: email,
				});
				if (applicationConfiguration.launchMode === `development`) {
					// eslint-disable-next-line no-console
					console.log(`Verification code sent to ${email}: ${code}`);
				}
				return { sessionId: session.id };
			},
		);
	},
);
