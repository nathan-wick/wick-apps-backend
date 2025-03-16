import { BaseController } from './base';
import DashboardConfigurationModel from '../models/dashboard-configuration';
import type { HttpStatus } from '../interfaces/http-status';

export class DashboardConfigurationController extends BaseController<DashboardConfigurationModel> {
	constructor() {
		super(DashboardConfigurationModel);
	}

	protected override async validateGet(
		item: DashboardConfigurationModel,
		userId?: number,
	): Promise<DashboardConfigurationModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}

	protected override async validatePost(
		item: DashboardConfigurationModel,
		userId?: number,
	): Promise<DashboardConfigurationModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot create a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}

	protected override async validatePut(
		existingItem: DashboardConfigurationModel,
		newItem: Partial<DashboardConfigurationModel>,
		userId?: number,
	): Promise<Partial<DashboardConfigurationModel>> {
		if (userId !== existingItem.userId || userId !== newItem.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot update a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return newItem;
	}

	protected override async validateDelete(
		item: DashboardConfigurationModel,
		userId?: number,
	): Promise<DashboardConfigurationModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}
}
