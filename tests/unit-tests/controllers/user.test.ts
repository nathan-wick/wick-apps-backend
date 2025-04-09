import { UserController, UserModel } from '../../../source';
import { BaseControllerTest } from '../../helpers/base-controller-test';

export class UserControllerTest extends BaseControllerTest<UserModel> {
	constructor() {
		super(UserController);
	}
}

describe(`User Controller`, () => {
	new UserControllerTest().registerTests();
});
