import { Application } from '../../../source';
import { SessionHelper } from '../../helpers/session';
import { UserHelper } from '../../helpers/user';
import request from 'supertest';
import { testApplicationConfiguration } from '../../helpers/application-configuration';

describe(`UserController`, () => {
	let application: Application;
	let userHelper: UserHelper;

	beforeAll(async () => {
		application = new Application(testApplicationConfiguration);
		await application.start();
		userHelper = new UserHelper();
		await userHelper.createTestUsers();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe(`get user by ID`, () => {
		it(`should error when no session token is provided`, async () => {
			const userToGet = userHelper.brock;
			const response = await request(application.express).get(
				`/user/${userToGet!.id}`,
			);
			expect(response.status).toBe(401);
		});

		it(`should return the user`, async () => {
			const signedInUser = userHelper.brock;
			const sessionToken = await SessionHelper.createTestSession(
				signedInUser!,
			);
			const userToGet = userHelper.brock;
			const response = await request(application.express)
				.get(`/user/${userToGet!.id}`)
				.set({ 'Session-Token': sessionToken });
			expect(response.status).toBe(200);
			expect(response.body).toEqual(userToGet);
		});
	});
});
