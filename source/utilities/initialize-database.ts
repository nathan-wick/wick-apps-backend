import { database } from '../start-application.js';
import { initializeDashboardConfiguration } from '../database-models/dashboard-configuration.js';
import { initializePreferences } from '../database-models/preferences.js';
import { initializeSession } from '../database-models/session.js';
import { initializeUser } from '../database-models/user.js';

const initializeDatabase = async () => {
	initializeDashboardConfiguration(database);
	initializePreferences(database);
	initializeSession(database);
	initializeUser(database);

	await database.sync({ alter: true });
};

export default initializeDatabase;
