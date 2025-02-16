import { Op } from 'sequelize';
import Session from '../database-models/session.js';

export const expireExcessSessions = async (userId: number) => {
	const now = new Date();
	const activeSessions = await Session.findAll({
		order: [[`started`, `DESC`]],
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
			}),
		);
	}
};
