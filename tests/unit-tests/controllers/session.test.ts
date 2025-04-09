import { SessionController, SessionModel } from '../../../source';
import { BaseControllerTest } from '../../helpers/base-controller-test';

export class SessionControllerTest extends BaseControllerTest<SessionModel> {
	constructor() {
		super(SessionController);
	}
}

describe(`Session Controller`, () => {
	new SessionControllerTest().registerTests();
});
