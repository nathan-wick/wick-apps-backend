import { AuthenticationController } from './controllers/authentication.js';
import { Router } from 'express';
import { dashboardConfigurationController } from './controllers/dashboard-configuration.js';
import { preferencesController } from './controllers/preferences.js';
import { userController } from './controllers/user.js';

export const mainRouter = Router();

// Authentication
const authenticationRouter = Router();
mainRouter.use(`/authentication`, authenticationRouter);
authenticationRouter.get(
	`/active-sessions`,
	AuthenticationController.getActiveSessions,
);
authenticationRouter.post(
	`/send-verification-email`,
	AuthenticationController.sendVerificationEmail,
);
authenticationRouter.post(`/sign-in`, AuthenticationController.signIn);
authenticationRouter.post(`/sign-out`, AuthenticationController.signOut);

// Dashboard Configuration
const dashboardConfigurationRouter = Router();
mainRouter.use(`/dashboard-configuration`, dashboardConfigurationRouter);
dashboardConfigurationRouter.get(`/`, dashboardConfigurationController.get);
dashboardConfigurationRouter.put(`/`, dashboardConfigurationController.put);

// Preferences
const preferencesRouter = Router();
mainRouter.use(`/preferences`, preferencesRouter);
preferencesRouter.put(`/`, preferencesController.put);

// User
const userRouter = Router();
mainRouter.use(`/user`, userRouter);
userRouter.get(`/`, userController.get);
userRouter.put(`/`, userController.put);
