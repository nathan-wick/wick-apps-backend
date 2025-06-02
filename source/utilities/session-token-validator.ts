import type { NextFunction, Request, Response } from 'express';
import type { HttpStatus } from '../interfaces/http-status';
import SessionModel from '../models/session';
import type { SessionToken } from '../interfaces/session-token';
import { Shield } from './shield';
import jwt from 'jsonwebtoken';

export default class SessionTokenValidator {
	private key: string;

	constructor() {
		this.key = Shield.generateRandomKey();
	}

	public middleware() {
		const validateSessionToken = async (
			request: Request,
			response: Response,
			next: NextFunction,
		) => {
			const codedSessionToken = request.header(`Session-Token`);
			if (!codedSessionToken) {
				// eslint-disable-next-line no-undefined
				request.validatedSession = undefined;
				return next();
			}
			delete request.headers[`Session-Token`];
			const decodedSessionToken =
				this.decodeSessionToken(codedSessionToken);
			await SessionModel.findByPk(decodedSessionToken.sessionId).then(
				(session) => {
					if (!session?.userId) {
						const error: HttpStatus = {
							code: 401,
							message: `Invalid session token.`,
						};
						response
							.status(error.code)
							.send({ message: error.message });
					}
					if (session!.expires < new Date()) {
						const error: HttpStatus = {
							code: 401,
							message: `Session expired.`,
						};
						response
							.status(error.code)
							.send({ message: error.message });
					}
					request.validatedSession = session!;
				},
			);
			// TODO This is sketch. Might cause async related errors
			return next();
		};
		return validateSessionToken;
	}

	public codeSessionToken(sessionToken: SessionToken): string {
		return jwt.sign(sessionToken, this.key);
	}

	private decodeSessionToken(codedToken: string): SessionToken {
		try {
			const decodedToken = jwt.verify(
				codedToken,
				this.key,
			) as SessionToken;
			return decodedToken;
		} catch {
			const error: HttpStatus = {
				code: 401,
				message: `Session token could not be decoded.`,
			};
			throw error;
		}
	}
}
