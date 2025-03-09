import 'express';
import type SessionModel from '../models/session.js';

// eslint-disable-next-line quotes
declare module 'express' {
	export interface Request {
		validatedSession?: SessionModel;
	}
}
