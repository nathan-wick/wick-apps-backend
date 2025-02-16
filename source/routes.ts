import { AuthenticationController } from './controllers/authentication-controller.js';
import { Router } from 'express';
import { dashboardConfigurationController } from './controllers/dashboard-configuration-controller.js';
import { preferencesController } from './controllers/preferences-controller.js';
import { userController } from './controllers/user-controller.js';

export const authenticationRoute = Router();
export const dashboardConfigurationRoute = Router();
export const preferencesRoute = Router();
export const userRoute = Router();

authenticationRoute.get(
	`/active-sessions`,
	AuthenticationController.getActiveSessions,
);
authenticationRoute.post(
	`/send-verification-email`,
	AuthenticationController.sendVerificationEmail,
);
authenticationRoute.post(`/sign-in`, AuthenticationController.signIn);
authenticationRoute.post(`/sign-out`, AuthenticationController.signOut);

dashboardConfigurationRoute.get(`/`, dashboardConfigurationController.get);
dashboardConfigurationRoute.put(`/`, dashboardConfigurationController.put);

preferencesRoute.put(`/`, preferencesController.put);

userRoute.get(`/`, userController.get);
userRoute.put(`/`, userController.put);
