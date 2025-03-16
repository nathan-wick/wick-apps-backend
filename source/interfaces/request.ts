import 'express';
import type SessionModel from '../models/session';

// eslint-disable-next-line quotes
declare module 'express' {
	export interface Request {
		validatedSession?: SessionModel;
	}
}
