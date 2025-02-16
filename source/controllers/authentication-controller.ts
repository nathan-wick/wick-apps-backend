import { type Request, type Response } from 'express';
import Session, { type SessionOutput } from '../database-models/session.js';
import { Op } from 'sequelize';
import type { RequestValidationOutput } from '../interfaces/authentication/request-validation-output.js';
import type { SendVerificationEmailInput } from '../interfaces/authentication/send-verification-email-input.js';
import type { SignInInput } from '../interfaces/authentication/sign-in-input.js';
import User from '../database-models/user.js';
import { applicationConfiguration } from '../start-application.js';
import { applicationKey } from '../constants/application-key.js';
import codeSessionToken from '../utilities/code-session-token.js';
import decodeSessionToken from '../utilities/decode-session-token.js';
import { expireExcessSessions } from '../utilities/expire-excess-sessions.js';
import generateRandomCode from '../utilities/generate-random-code.js';
import getLocationFromIp from '../utilities/get-location-from-ip.js';
import hash from '../utilities/hash.js';
import isHashMatch from '../utilities/is-hash-match.js';
import runRequest from '../utilities/run-request.js';
import { sendEmail } from '../utilities/send-email.js';
import simplifyUserAgent from '../utilities/simplify-user-agent.js';
import throwError from '../utilities/throw-error.js';
import validateEmail from '../utilities/validate-email.js';

export class AuthenticationController {
	static async getActiveSessions(request: Request, response: Response) {
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
	}

	static async sendVerificationEmail(request: Request, response: Response) {
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
	}

	static async signIn(request: Request, response: Response) {
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
	}

	static async signOut(request: Request, response: Response) {
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
	}
}
