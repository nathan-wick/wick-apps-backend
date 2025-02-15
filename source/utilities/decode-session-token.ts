import type { SessionToken } from '../interfaces/authentication/session-token.js';
import jwt from 'jsonwebtoken';
import throwError from './throw-error.js';

const decodeSessionToken = (codedToken: string, key: string): SessionToken => {
	let decodedToken: SessionToken = { sessionId: 0 };

	try {
		decodedToken = jwt.verify(codedToken, key) as SessionToken;
	} catch {
		throwError(401, `Session token could not be decoded.`);
	}

	return decodedToken;
};

export default decodeSessionToken;
