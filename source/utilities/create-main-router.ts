import {
	authenticationRoute,
	dashboardConfigurationRoute,
	preferencesRoute,
	userRoute,
} from '../routes/routes.js';
import { Router } from 'express';
import { applicationConfiguration } from '../start-application.js';

const createMainRouter = () => {
	const router = Router();

	router.use(`/authentication`, authenticationRoute);
	router.use(`/dashboard-configuration`, dashboardConfigurationRoute);
	router.use(`/preferences`, preferencesRoute);
	router.use(`/user`, userRoute);

	applicationConfiguration.routers.forEach((additionalRouter) =>
		router.use(additionalRouter.path, additionalRouter.router),
	);

	return router;
};

export default createMainRouter;
