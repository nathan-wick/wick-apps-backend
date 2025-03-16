import { UserModel } from '../../source';

export class UserHelper {
	public brock: UserModel | undefined;
	public ella: UserModel | undefined;
	public anita: UserModel | undefined;

	public async createTestUsers() {
		this.brock = await UserModel.create({
			birthday: null,
			email: `brock.lee@wickapps.com`,
			firstName: `Brock`,
			id: 1,
			lastName: `Lee`,
			picture: null,
		});
		this.ella = await UserModel.create({
			birthday: null,
			email: `ella.vator@wickapps.com`,
			firstName: `Ella`,
			id: 2,
			lastName: `Vator`,
			picture: null,
		});
		this.anita = await UserModel.create({
			birthday: null,
			email: `anita.bath@wickapps.com`,
			firstName: `Anita`,
			id: 3,
			lastName: `Bath`,
			picture: null,
		});
	}
}
