import { type Request, type Response } from 'express';
import DashboardConfiguration from '../../database-models/dashboard-configuration.js';
import type { RequestValidationOutput } from '../../interfaces/authentication/request-validation-output.js';
import { dashboardConfigurationRoute } from '../routes.js';
import runRequest from '../../utilities/run-request.js';
import throwError from '../../utilities/throw-error.js';

dashboardConfigurationRoute.get(
	`/`,
	async (request: Request, response: Response) => {
		await runRequest(
			{
				request,
				response,
			},
			{
				sessionTokenIsRequired: true,
			},
			async (requestValidationOutput: RequestValidationOutput) => {
				const dashboard = String(request.query.dashboard);
				if (!requestValidationOutput.userId) {
					throwError(400, `User ID is required.`);
				}
				if (!dashboard) {
					throwError(400, `Dashboard is required.`);
				}
				const dashboardConfiguration =
					await DashboardConfiguration.findOne({
						where: {
							dashboard,
							userId: requestValidationOutput.userId,
						},
					});
				return dashboardConfiguration
					? dashboardConfiguration.configuration
					: null;
			},
		);
	},
);
