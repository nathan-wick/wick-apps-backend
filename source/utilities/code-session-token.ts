import type { SessionToken } from '../interfaces/authentication/session-token.js';
import jwt from 'jsonwebtoken';

const codeSessionToken = (sessionToken: SessionToken, key: string) =>
	jwt.sign(sessionToken, key);

export default codeSessionToken;
