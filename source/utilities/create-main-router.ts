import { Router } from 'express';
import authenticationRoute from '../routes/authentication.js';
import dashboardConfigurationRoute from '../routes/dashboard-configuration.js';
import preferencesRoute from '../routes/preferences.js';
import userRoute from '../routes/user.js';

const createMainRouter = (routers: { url: string; router: Router }[]) => {
	const router = Router();

	router.use(`/authentication`, authenticationRoute);
	router.use(`/dashboard-configuration`, dashboardConfigurationRoute);
	router.use(`/preferences`, preferencesRoute);
	router.use(`/user`, userRoute);

	routers.forEach((additionalRouter) =>
		router.use(additionalRouter.url, additionalRouter.router),
	);

	return router;
};

export default createMainRouter;
