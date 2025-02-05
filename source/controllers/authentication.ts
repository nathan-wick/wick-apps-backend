import { Request, Response, Router, } from "express";
import Session, { SessionOutput, } from "../database/models/session";
import { Op, } from "sequelize";
import { RequestValidationOutput, } from "../interfaces/request-validation-output";
import { SendVerificationEmailInput, } from "../interfaces/send-verification-email-input";
import { SignInInput, } from "../interfaces/sign-in-input";
import User from "../database/models/user";
import { applicationKey, } from "../constants/application-key";
import decodeSessionToken from "../utilities/decode-session-token";
import generateRandomCode from "../utilities/generate-random-code";
import generateToken from "../utilities/code-session-token";
import getLocationFromIp from "../utilities/get-location-from-ip";
import hash from "../utilities/hash";
import isHashMatch from "../utilities/is-hash-match";
import runRequest from "../utilities/run-request";
import simplifyUserAgent from "../utilities/simplify-user-agent";
import throwError from "../utilities/throw-error";
import validateEmail from "../utilities/validate-email";

const authenticationController = Router();

const expireExcessSessions = async (userId: number) => {
    const now = new Date();
    const activeSessions = await Session.findAll({
        order: [[`started`, `DESC`,],],
        where: {
            expires: {
                [Op.gt]: now,
            },
            successfulAttempts: {
                [Op.gt]: 0,
            },
            userId,
        },
    });

    if (activeSessions.length > 3) {
        const excessSessions = activeSessions.slice(3);

        await Promise.all(
            excessSessions.map(async (excessSession) => {
                excessSession.expires = now;
                await excessSession.save();
            })
        );
    }
};

authenticationController.post(`/send-verification-email`, async (request: Request, response: Response) => {
    await runRequest(
        {
            request,
            response,
        },
        {
            sessionTokenIsRequired: false,
        },
        async () => {
            const { email, }: SendVerificationEmailInput = request.body;
            const device = simplifyUserAgent(request.get(`User-Agent`));
            const location = getLocationFromIp(request.ip);
            if (!email) {
                throwError(400, `Email is required.`);
            }
            validateEmail(email);
            const user = await User.findOne({ where: { email, },}) ?? await User.create({ email, });
            const code = generateRandomCode();
            const now = new Date();
            const oneMonthFromNow = new Date(new Date().setTime(new Date().getTime() + 30 * 24 * 60 * 60 * 1000));
            const session = await Session.create({
                code: await hash(String(code)),
                device,
                expires: oneMonthFromNow,
                failedAttempts: 0,
                location,
                started: now,
                successfulAttempts: 0,
                userId: user.id,
            });
            // TODO Send email.
            // eslint-disable-next-line no-console
            console.log(`Code: ${code}`);
            return {sessionId: session.id,};
        },
    );
});

authenticationController.post(`/sign-in`, async (request: Request, response: Response) => {
    await runRequest(
        {
            request,
            response,
        },
        {
            sessionTokenIsRequired: false,
        },
        async () => {
            const { sessionId, code, } : SignInInput = request.body;
            if (!sessionId) {
                throwError(400, `Session ID is required.`);
            }
            if (!code) {
                throwError(400, `Code is required.`);
            }
            const session = await Session.findByPk(sessionId);
            if (!session) {
                throwError(404, `Session not found.`);
            }
            if (session!.successfulAttempts > 0) {
                throwError(400, `Session already used.`);
            }
            const codeIsValid = await isHashMatch(code, session!.code);
            if (!codeIsValid) {
                if (session!.failedAttempts > 1) {
                    throwError(429, `Too many failed attempts.`);
                    // TODO Ban the requesting user. On the front-end, redirect to the email input.
                }
                await session!.update({
                    failedAttempts: session!.failedAttempts + 1,
                });
                throwError(400, `Incorrect code.`);
            }
            await session!.update({
                successfulAttempts: session!.successfulAttempts + 1,
            });
            expireExcessSessions(session!.userId);
            const sessionToken = generateToken({sessionId: session!.id,}, applicationKey);
            return { sessionToken, };
        },
    );
});

authenticationController.post(`/sign-out`, async (request: Request, response: Response) => {
    await runRequest(
        {
            request,
            response,
        },
        {
            sessionTokenIsRequired: true,
        },
        async () => {
            const codedSessionToken = String(request.header(`Session-Token`));
            const decodedSessionToken = decodeSessionToken(codedSessionToken, applicationKey);
            const session = await Session.findByPk(decodedSessionToken.sessionId);
            if (session) {
                session.expires = new Date();
                await session.save();
            }
        },
    );
});

authenticationController.get(`/active-sessions`, async (request: Request, response: Response) => {
    await runRequest(
        {
            request,
            response,
        },
        {
            sessionTokenIsRequired: true,
        },
        async (requestValidationOutput: RequestValidationOutput) => {
            if (!requestValidationOutput.userId) {
                throwError(400, `User ID is required.`);
            }
            const activeSessions: SessionOutput[] = await Session.findAll({
                order: [[`started`, `DESC`,],],
                where: {
                    expires: {
                        [Op.gt]: new Date(),
                    },
                    successfulAttempts: {
                        [Op.gt]: 0,
                    },
                    userId: requestValidationOutput.userId,
                },
            });
            return {activeSessions,};
        },
    );
});

export default authenticationController;