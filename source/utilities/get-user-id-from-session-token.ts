import type { Request } from 'express';
import Session from '../database-models/session.js';
import { applicationKey } from '../constants/application-key.js';
import decodeSessionToken from './decode-session-token.js';

const getUserIdFromSessionToken = async (
	request: Request,
): Promise<number | undefined> => {
	const codedSessionToken = String(request.header(`Session-Token`));
	const decodedSessionToken = decodeSessionToken(
		codedSessionToken,
		applicationKey,
	);
	const session = await Session.findByPk(decodedSessionToken.sessionId);
	return session?.userId;
};

export default getUserIdFromSessionToken;
