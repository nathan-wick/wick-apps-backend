import type { SessionToken } from '../interfaces/session-token.js';
import jwt from 'jsonwebtoken';

const codeSessionToken = (sessionToken: SessionToken, key: string) =>
	jwt.sign(sessionToken, key);

export default codeSessionToken;
