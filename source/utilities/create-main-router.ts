import { Router } from 'express';
import authenticationRoute from '../routes/authentication';
import dashboardConfigurationRoute from '../routes/dashboard-configuration';
import preferencesRoute from '../routes/preferences';
import userRoute from '../routes/user';

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
