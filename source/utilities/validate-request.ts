import type { CallSecurityOptions } from '../interfaces/call-security-options.js';
import type { Request } from 'express';
import type { RequestValidationOutput } from '../interfaces/request-validation-output.js';
import Session from '../database-models/session.js';
import { applicationKey } from '../constants/application-key.js';
import decodeSessionToken from './decode-session-token.js';
import { rateLimiter } from '../constants/rate-limiter.js';
import throwError from './throw-error.js';

const validateRequest = async (
	request: Request,
	security: CallSecurityOptions,
): Promise<RequestValidationOutput> => {
	const { sessionTokenIsRequired } = security;

	// TODO Make a more secure key
	const ipAddress = request.ip;
	const userAgent = request.get(`User-Agent`);
	const key = `${ipAddress}:${userAgent}`;
	const isBlocked = rateLimiter.checkIfKeyIsBlocked(key);
	let userId: number | undefined;

	if (isBlocked) {
		throwError(429, `Request rate limit exceeded.`);
	}

	if (sessionTokenIsRequired) {
		const codedSessionToken = String(request.header(`Session-Token`));

		if (!codedSessionToken) {
			throwError(400, `Session token is required.`);
		}

		const decodedSessionToken = decodeSessionToken(
			codedSessionToken,
			applicationKey,
		);
		const session = await Session.findByPk(decodedSessionToken.sessionId);
		userId = session?.userId;

		if (!session || !userId) {
			throwError(401, `Session not found.`);
		}

		if (session!.expires < new Date()) {
			throwError(401, `Session expired.`);
		}
	}

	return { userId };
};

export default validateRequest;
