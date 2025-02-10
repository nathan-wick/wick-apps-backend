import { SessionToken } from '../interfaces/session-token';
import throwError from './throw-error';
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
