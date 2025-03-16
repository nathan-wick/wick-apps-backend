import { BaseController } from './base';
import type { HttpStatus } from '../interfaces/http-status';
import PreferencesModel from '../models/preferences';

export class PreferencesController extends BaseController<PreferencesModel> {
	constructor() {
		super(PreferencesModel);
	}

	protected override async validateGet(
		item: PreferencesModel,
		userId?: number,
	): Promise<PreferencesModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return item;
	}

	protected override async validatePost(
		item: PreferencesModel,
		userId?: number,
	): Promise<PreferencesModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot create ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return item;
	}

	protected override async validatePut(
		existingItem: PreferencesModel,
		newItem: Partial<PreferencesModel>,
		userId?: number,
	): Promise<Partial<PreferencesModel>> {
		if (userId !== existingItem.userId || userId !== newItem.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot update ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return newItem;
	}

	protected override async validateDelete(
		item: PreferencesModel,
		userId?: number,
	): Promise<PreferencesModel> {
		if (userId !== item.userId) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete ${this.titleCasedTypeName} that aren't yours.`,
			};
			throw error;
		}

		return item;
	}
}
