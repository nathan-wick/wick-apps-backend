import { BaseController } from './base';
import DashboardConfigurationModel from '../models/dashboard-configuration';
import type { HttpStatus } from '../interfaces/http-status';

export class DashboardConfigurationController extends BaseController<DashboardConfigurationModel> {
	constructor() {
		super(DashboardConfigurationModel);
	}

	public override async validateGet(
		instance: DashboardConfigurationModel,
		userId?: number,
	): Promise<DashboardConfigurationModel> {
		if (userId !== instance.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return instance;
	}

	public override async validateCreate(
		instance: DashboardConfigurationModel,
		userId?: number,
	): Promise<DashboardConfigurationModel> {
		if (userId !== instance.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot create a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return instance;
	}

	public override async validateEdit(
		existingInstance: DashboardConfigurationModel,
		newInstance: Partial<DashboardConfigurationModel>,
		userId?: number,
	): Promise<Partial<DashboardConfigurationModel>> {
		if (
			userId !== existingInstance.userId ||
			userId !== newInstance.userId
		) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot update a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return newInstance;
	}

	public override async validateDelete(
		instance: DashboardConfigurationModel,
		userId?: number,
	): Promise<DashboardConfigurationModel> {
		if (userId !== instance.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return instance;
	}
}
