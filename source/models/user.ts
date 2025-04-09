import {
	type CreationOptional,
	DataTypes,
	type InferAttributes,
	type InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';
import DashboardConfigurationModel from './dashboard-configuration';
import PreferencesModel from './preferences';
import SessionModel from './session';

export class UserModel extends Model<
	InferAttributes<UserModel>,
	InferCreationAttributes<UserModel>
> {
	declare id: CreationOptional<number>;
	declare email: string;
	declare picture: string | null;
	declare firstName: string | null;
	declare lastName: string | null;
	declare birthday: Date | null;

	declare sessions?: SessionModel[];
	declare preferences?: PreferencesModel;
	declare dashboardConfigurations?: DashboardConfigurationModel[];
}

export const initializeUserModel = (sequelize: Sequelize) => {
	UserModel.init(
		{
			birthday: {
				defaultValue: null,
				type: DataTypes.DATEONLY,
			},
			email: {
				allowNull: false,
				type: DataTypes.STRING(255),
				unique: true,
				validate: {
					isEmail: true,
				},
			},
			firstName: {
				defaultValue: null,
				type: DataTypes.STRING(50),
			},
			id: {
				autoIncrement: true,
				primaryKey: true,
				type: DataTypes.INTEGER,
			},
			lastName: {
				defaultValue: null,
				type: DataTypes.STRING(50),
			},
			picture: {
				defaultValue: null,
				type: DataTypes.TEXT,
			},
		},
		{
			hooks: {
				afterCreate: async (user: UserModel) => {
					await PreferencesModel.create({
						brightness: `system`,
						dateFormat: `YYYY/MM/DD`,
						primaryColor: `default`,
						userId: user.id,
					});
				},
			},
			sequelize,
		},
	);
};

export default UserModel;
