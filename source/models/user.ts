import {
	type CreationOptional,
	DataTypes,
	type InferAttributes,
	type InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';
import DashboardConfiguration from './dashboard-configuration';
import Preferences from './preferences';
import Session from './session';

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

	declare sessions?: Session[];
	declare preferences?: Preferences;
	declare dashboardConfigurations?: DashboardConfiguration[];
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
					await Preferences.create({
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

	UserModel.hasMany(Session, {
		as: `sessions`,
		foreignKey: `userId`,
		onDelete: `CASCADE`,
	});

	UserModel.hasOne(Preferences, {
		as: `preferences`,
		foreignKey: `userId`,
		onDelete: `CASCADE`,
	});

	UserModel.hasMany(DashboardConfiguration, {
		as: `dashboardConfigurations`,
		foreignKey: `userId`,
		onDelete: `CASCADE`,
	});
};

export default UserModel;
