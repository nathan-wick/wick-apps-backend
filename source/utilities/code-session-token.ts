import type { SessionToken } from '../interfaces/session-token.js';
import { sign } from 'jsonwebtoken';

const codeSessionToken = (sessionToken: SessionToken, key: string) =>
	sign(sessionToken, key);

export default codeSessionToken;
