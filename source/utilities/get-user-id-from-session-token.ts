import { Request, } from "express";
import Session from "../database-models/session";
import { applicationKey, } from "../constants/application-key";
import decodeSessionToken from "./decode-session-token";

const getUserIdFromSessionToken = async (request: Request): Promise<number | undefined> => {
    const codedSessionToken = String(request.header(`Session-Token`));
    const decodedSessionToken = decodeSessionToken(codedSessionToken, applicationKey);
    const session = await Session.findByPk(decodedSessionToken.sessionId);
    return session?.userId;
};

export default getUserIdFromSessionToken;