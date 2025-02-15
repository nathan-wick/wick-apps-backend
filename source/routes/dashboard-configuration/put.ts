import DashboardConfiguration, {
	type DashboardConfigurationInput,
} from '../../database-models/dashboard-configuration.js';
import { type Request, type Response } from 'express';
import type { RequestValidationOutput } from '../../interfaces/request-validation-output.js';
import { dashboardConfigurationRoute } from '../routes.js';
import runRequest from '../../utilities/run-request.js';
import throwError from '../../utilities/throw-error.js';

dashboardConfigurationRoute.put(
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
				const payload: DashboardConfigurationInput = request.body;
				if (!requestValidationOutput.userId) {
					throwError(400, `User ID is required.`);
				}
				if (!payload.dashboard) {
					throwError(400, `Dashboard is required.`);
				}
				const dashboardConfiguration =
					await DashboardConfiguration.findOne({
						where: {
							dashboard: payload.dashboard,
							userId: requestValidationOutput.userId,
						},
					});
				const newDashboardConfiguration =
					dashboardConfiguration?.update({
						configuration: payload.configuration,
					}) ??
					DashboardConfiguration.create({
						configuration: payload.configuration,
						dashboard: payload.dashboard,
						userId: requestValidationOutput.userId!,
					});
				return newDashboardConfiguration;
			},
		);
	},
);
