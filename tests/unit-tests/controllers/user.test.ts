import { UserController, UserModel } from '../../../source';
import { BaseControllerTest } from '../../helpers/base-controller-test';
import request from 'supertest';

export class UserControllerTest extends BaseControllerTest<UserModel> {
	constructor() {
		super(UserController);
	}

	public override registerTests() {
		super.registerTests();
		this.testGetByCurrentSession();
	}

	private testGetByCurrentSession() {
		describe(`get by current session`, () => {
			it(`should return the currently authenticated user`, async () => {
				const response = await request(this.application.express)
					.get(`/${this.controller.kebabCasedTypeName}/get-by-current-session`)
					.set(this.testUserSessionTokenHeader);
				expect(response.status).toBe(200);
				const expectedUser = this.pickAttributes(
					this.testUser.get({ plain: true }),
					Object.keys(UserModel.getAttributes()),
				);
				expect(response.body).toEqual(this.jsonDeepClone(expectedUser));
			});
		});
	}
}

describe(`User Controller`, () => {
	new UserControllerTest().registerTests();
});
