import { SessionOutput, } from "../database/models/session";

export interface GetActiveSessionsOutput {
    activeSessions: SessionOutput[];
}