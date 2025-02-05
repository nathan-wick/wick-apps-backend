import { Router, } from "express";
import authenticationController from "./authentication";
import dashboardConfigurationController from "./dashboard-configuration";
import preferencesController from "./preferences";
import userController from "./user";

const router = Router();

router.use(`/authentication`, authenticationController);
router.use(`/dashboard-configuration`, dashboardConfigurationController);
router.use(`/preferences`, preferencesController);
router.use(`/user`, userController);

export default router;