import { type Request, type Response } from 'express';
import { BaseController } from './base';
import { Emailer } from '../utilities/emailer';
import type { HttpStatus } from '../interfaces/http-status';
import { Op } from 'sequelize';
import SessionModel from '../models/session';
import { Shield } from '../utilities/shield';
import UserModel from '../models/user';
import { applicationConfiguration } from '../utilities/application';
import { emailer } from '../constants/emailer';
import sendErrorResponse from '../utilities/send-error-response';
import { sessionTokenValidator } from '../constants/session-token-validator';

export class SessionController extends BaseController<SessionModel> {
	constructor() {
		super(SessionModel, {
			enablePost: false,
			enablePut: false,
		});
	}

	protected override async validateGet(
		item: SessionModel,
		userId?: number,
	): Promise<SessionModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}

	protected override async validateDelete(
		item: SessionModel,
		userId?: number,
	): Promise<SessionModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}

	protected override initializeAdditionalRoutes(): void {
		this.router.post(
			`/send-verification-email`,
			this.sendVerificationEmail.bind(this),
		);
		this.router.post(`/sign-in`, this.signIn.bind(this));
		this.router.post(`/sign-out`, this.signOut.bind(this));
	}

	private async sendVerificationEmail(
		request: Request,
		response: Response,
	): Promise<void> {
		try {
			const { email } = request.body;
			if (!Emailer.addressIsValid(String(email))) {
				const error: HttpStatus = {
					code: 400,
					message: `Email is invalid.`,
				};
				throw error;
			}
			const user =
				(await UserModel.findOne({ where: { email } })) ??
				(await UserModel.create({ email }));
			const code = Shield.generateRandomCode();
			const device = Shield.simplifyUserAgent(request.get(`User-Agent`));
			const location = Shield.getLocationFromIp(request.ip);
			const now = new Date();
			const oneMonthFromNow = new Date(
				new Date().setTime(now.getTime() + 30 * 24 * 60 * 60 * 1000),
			);
			const session = await SessionModel.create({
				code: await Shield.hash(String(code)),
				device,
				expires: oneMonthFromNow,
				failedAttempts: 0,
				location,
				started: now,
				successfulAttempts: 0,
				userId: user.id,
			});
			await emailer.send({
				subject: `Verification Code`,
				text: `${code} is your verification code to sign into ${applicationConfiguration.name}.

Never share this code with anyone, including our support team.
We will never ask for this code via phone, email, or chat.`,
				to: email,
			});
			response.status(200).send({ sessionId: session.id });
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}

	private async signIn(request: Request, response: Response): Promise<void> {
		try {
			const { sessionId, code } = request.body;
			if (!sessionId) {
				const error: HttpStatus = {
					code: 400,
					message: `Session ID is required.`,
				};
				throw error;
			}
			if (!code) {
				const error: HttpStatus = {
					code: 400,
					message: `Code is required.`,
				};
				throw error;
			}
			const session = await SessionModel.findByPk(sessionId);
			if (!session) {
				const error: HttpStatus = {
					code: 404,
					message: `Session not found.`,
				};
				throw error;
			}
			if (session.successfulAttempts > 0) {
				const error: HttpStatus = {
					code: 400,
					message: `Session is in use.`,
				};
				throw error;
			}
			const codeIsValid = await Shield.isHashMatch(code, session!.code);
			if (!codeIsValid) {
				if (session.failedAttempts > 0) {
					const error: HttpStatus = {
						code: 429,
						message: `Too many failed attempts.`,
					};
					// TODO Rate limit the requesting user
					throw error;
				}
				await session.update({
					failedAttempts: session.failedAttempts + 1,
				});
				const error: HttpStatus = {
					code: 400,
					message: `Incorrect code. You have one attempt remaining.`,
				};
				throw error;
			}
			await session.update({
				successfulAttempts: session.successfulAttempts + 1,
			});
			const now = new Date();
			const activeSessions = await SessionModel.findAll({
				order: [[`started`, `DESC`]],
				where: {
					expires: {
						[Op.gt]: now,
					},
					successfulAttempts: {
						[Op.gt]: 0,
					},
					userId: session.userId,
				},
			});
			if (activeSessions.length > 3) {
				const excessSessions = activeSessions.slice(3);
				await Promise.all(
					excessSessions.map(async (excessSession) => {
						await excessSession.destroy();
					}),
				);
			}
			const sessionToken = sessionTokenValidator.codeSessionToken({
				sessionId: session.id,
			});
			response.status(200).send({ sessionToken });
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}

	private async signOut(request: Request, response: Response): Promise<void> {
		try {
			const session = request.validatedSession;
			if (session) {
				session.expires = new Date();
				await session.save();
			}
			response.status(200);
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}
}
