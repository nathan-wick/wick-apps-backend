import { SessionModel, UserModel, sessionTokenValidator } from '../../source';

export class SessionHelper {
	public static async createTestSession(user: UserModel): Promise<string> {
		const now = new Date();
		const oneMonthFromNow = new Date(
			new Date().setTime(now.getTime() + 30 * 24 * 60 * 60 * 1000),
		);
		const session = await SessionModel.create({
			code: `test code`,
			device: `test device`,
			expires: oneMonthFromNow,
			failedAttempts: 0,
			location: `test location`,
			started: now,
			successfulAttempts: 1,
			userId: user.id,
		});
		const sessionToken = sessionTokenValidator.codeSessionToken({
			sessionId: session.id,
		});
		return sessionToken;
	}
}
