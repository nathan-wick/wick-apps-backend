/* eslint-disable sort-imports */
import { Router } from 'express';

export const authenticationRoute = Router();
export const dashboardConfigurationRoute = Router();
export const preferencesRoute = Router();
export const userRoute = Router();

import './authentication/active-sessions.js';
import './authentication/send-verification-email.js';
import './authentication/sign-in.js';
import './authentication/sign-out.js';
import './dashboard-configuration/get.js';
import './dashboard-configuration/put.js';
import './preferences/put.js';
import './user/get.js';
import './user/put.js';
