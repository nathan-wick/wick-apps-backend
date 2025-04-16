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
		instance: UserModel,
		userId?: number,
	): Promise<UserModel> {
		if (userId !== instance.id) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot get a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return instance;
	}

	public override async validatePut(
		existingInstance: UserModel,
		newInstance: Partial<UserModel>,
		userId?: number,
	): Promise<Partial<UserModel>> {
		if (userId !== existingInstance.id || userId !== newInstance.id) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot update a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		if (newInstance.email && existingInstance.email !== newInstance.email) {
			const error: HttpStatus = {
				code: 400,
				message: `A ${this.titleCasedTypeName}'s email address cannot be changed.`,
			};
			throw error;
		}

		// TODO Validate the user's picture

		return newInstance;
	}

	public override async validateDelete(
		instance: UserModel,
		userId?: number,
	): Promise<UserModel> {
		if (userId !== instance.id) {
			const error: HttpStatus = {
				code: 403,
				message: `Cannot delete a ${this.titleCasedTypeName} that isn't yours.`,
			};
			throw error;
		}

		return instance;
	}
}
