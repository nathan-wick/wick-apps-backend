import { Sequelize } from 'sequelize';
import { initializeDashboardConfiguration } from '../database-models/dashboard-configuration.js';
import { initializePreferences } from '../database-models/preferences.js';
import { initializeSession } from '../database-models/session.js';
import { initializeUser } from '../database-models/user.js';

const initializeDatabase = async (sequelize: Sequelize) => {
	initializeDashboardConfiguration(sequelize);
	initializePreferences(sequelize);
	initializeSession(sequelize);
	initializeUser(sequelize);

	await sequelize.sync({ alter: true });
};

export default initializeDatabase;
