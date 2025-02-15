import type { SessionOutput } from '../../database-models/session.js';

export interface GetActiveSessionsOutput {
	activeSessions: SessionOutput[];
}
