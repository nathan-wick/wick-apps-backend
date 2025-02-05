import { sign } from 'jsonwebtoken';
import { SessionToken, } from '../interfaces/session-token';

const codeSessionToken = (sessionToken: SessionToken, key: string) => sign(sessionToken, key);

export default codeSessionToken;