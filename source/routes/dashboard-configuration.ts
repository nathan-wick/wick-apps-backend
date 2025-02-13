import DashboardConfiguration, {
	type DashboardConfigurationInput,
} from '../database-models/dashboard-configuration.js';
import { type Request, type Response, Router } from 'express';
import type { RequestValidationOutput } from '../interfaces/request-validation-output.js';
import runRequest from '../utilities/run-request.js';
import throwError from '../utilities/throw-error.js';

const dashboardConfigurationRoute = Router();

const getDashboard = async (userId?: number, dashboard?: string) => {
	if (!userId) {
		throwError(400, `User ID is required.`);
	}
	if (!dashboard) {
		throwError(400, `Dashboard is required.`);
	}
	return await DashboardConfiguration.findOne({
		where: {
			dashboard,
			userId,
		},
	});
};

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
				const dashboardConfiguration = await getDashboard(
					requestValidationOutput.userId,
					dashboard,
				);
				return dashboardConfiguration
					? dashboardConfiguration.configuration
					: null;
			},
		);
	},
);

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
				const dashboardConfiguration = await getDashboard(
					requestValidationOutput.userId,
					payload.dashboard,
				);
				const newDashboardConfiguration =
					dashboardConfiguration?.update({
						configuration: payload.configuration,
					}) ??
					DashboardConfiguration.create({
						configuration: payload.configuration,
						dashboard: payload.dashboard,
						userId: requestValidationOutput.userId,
					});
				return newDashboardConfiguration;
			},
		);
	},
);

export default dashboardConfigurationRoute;
