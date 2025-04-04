import { BaseController } from './base';
import type { HttpStatus } from '../interfaces/http-status';
import UserModel from '../models/user';

export class UserController extends BaseController<UserModel> {
	constructor() {
		super(UserModel, {
			enablePut: false,
		});
	}

	public override async validateGet(
		item: UserModel,
		userId?: number,
	): Promise<UserModel> {
		if (userId !== item.id) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}

	public override async validatePut(
		existingItem: UserModel,
		newItem: Partial<UserModel>,
		userId?: number,
	): Promise<Partial<UserModel>> {
		if (userId !== existingItem.id || userId !== newItem.id) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot update a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		if (newItem.email && existingItem.email !== newItem.email) {
			const error: HttpStatus = {
				code: 400,
				message: `A ${this.titleCasedTypeName}'s email address cannot be changed.`,
			};
			throw error;
		}

		// TODO Validate the user's picture

		return newItem;
	}

	public override async validateDelete(
		item: UserModel,
		userId?: number,
	): Promise<UserModel> {
		if (userId !== item.id) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return item;
	}
}
