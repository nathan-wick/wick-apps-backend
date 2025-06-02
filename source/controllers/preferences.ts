import { BaseController } from './base';
import type { HttpStatus } from '../interfaces/http-status';
import PreferencesModel from '../models/preferences';

export class PreferencesController extends BaseController<PreferencesModel> {
	constructor() {
		super(PreferencesModel);
	}

	public override async validateGet(
		instance: PreferencesModel,
		userId?: number,
	): Promise<PreferencesModel> {
		if (userId !== instance.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return instance;
	}

	public override async validateCreate(
		instance: PreferencesModel,
		userId?: number,
	): Promise<PreferencesModel> {
		if (userId !== instance.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot create ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return instance;
	}

	public override async validateEdit(
		existingInstance: PreferencesModel,
		newInstance: Partial<PreferencesModel>,
		userId?: number,
	): Promise<Partial<PreferencesModel>> {
		if (
			userId !== existingInstance.userId ||
			userId !== newInstance.userId
		) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot update ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return newInstance;
	}

	public override async validateDelete(
		instance: PreferencesModel,
		userId?: number,
	): Promise<PreferencesModel> {
		if (userId !== instance.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return instance;
	}
}
