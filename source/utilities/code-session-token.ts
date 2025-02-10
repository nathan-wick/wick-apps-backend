import { SessionToken } from '../interfaces/session-token';
import { sign } from 'jsonwebtoken';

const codeSessionToken = (sessionToken: SessionToken, key: string) =>
	sign(sessionToken, key);

export default codeSessionToken;
