import type { SessionToken } from '../interfaces/session-token.js';
import throwError from './throw-error.js';
import { verify } from 'jsonwebtoken';

const decodeSessionToken = (codedToken: string, key: string): SessionToken => {
	let decodedToken: SessionToken = { sessionId: 0 };

	try {
		decodedToken = verify(codedToken, key) as SessionToken;
	} catch {
		throwError(401, `Session token could not be decoded.`);
	}

	return decodedToken;
};

export default decodeSessionToken;
