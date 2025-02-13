import { DataTypes, Sequelize } from 'sequelize';
import DashboardConfiguration from '../database-models/dashboard-configuration.js';
import Preferences from '../database-models/preferences.js';
import Session from '../database-models/session.js';
import User from '../database-models/user.js';
import { brightnessValues } from '../constants/brightness.js';
import { colorValues } from '../constants/color.js';
import { dateFormatValues } from '../constants/date-format.js';

const initializeDashboardConfiguration = (sequelize: Sequelize) => {
	DashboardConfiguration.init(
		{
			configuration: {
				allowNull: false,
				type: DataTypes.STRING(255),
			},
			dashboard: {
				allowNull: false,
				type: DataTypes.STRING(255),
			},
			id: {
				autoIncrement: true,
				primaryKey: true,
				type: DataTypes.INTEGER,
			},
			userId: {
				allowNull: false,
				type: DataTypes.INTEGER,
			},
		},
		{ sequelize },
	);
};

const initializePreferences = (sequelize: Sequelize) => {
	Preferences.init(
		{
			brightness: {
				allowNull: false,
				defaultValue: `system`,
				type: DataTypes.ENUM(...brightnessValues),
			},
			dateFormat: {
				allowNull: false,
				defaultValue: `YYYY/MM/DD`,
				type: DataTypes.ENUM(...dateFormatValues),
			},
			primaryColor: {
				allowNull: false,
				defaultValue: `default`,
				type: DataTypes.ENUM(...colorValues),
			},
			userId: {
				allowNull: false,
				primaryKey: true,
				type: DataTypes.INTEGER,
			},
		},
		{ sequelize },
	);
};

const initializeSession = (sequelize: Sequelize) => {
	Session.init(
		{
			code: {
				allowNull: false,
				type: DataTypes.STRING(255),
			},
			device: {
				allowNull: false,
				type: DataTypes.STRING(255),
			},
			expires: {
				allowNull: false,
				type: DataTypes.DATE,
			},
			failedAttempts: {
				allowNull: false,
				type: DataTypes.INTEGER,
			},
			id: {
				autoIncrement: true,
				primaryKey: true,
				type: DataTypes.INTEGER,
			},
			location: {
				allowNull: false,
				type: DataTypes.STRING(255),
			},
			started: {
				allowNull: false,
				type: DataTypes.DATE,
			},
			successfulAttempts: {
				allowNull: false,
				type: DataTypes.INTEGER,
			},
			userId: {
				allowNull: false,
				type: DataTypes.INTEGER,
			},
		},
		{ sequelize },
	);
};

const initializeUser = (sequelize: Sequelize) => {
	User.init(
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
				afterCreate: async (user: User) => {
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

	User.hasMany(Session, {
		as: `sessions`,
		foreignKey: `userId`,
		onDelete: `CASCADE`,
	});
	
	User.hasOne(Preferences, {
		as: `preferences`,
		foreignKey: `userId`,
		onDelete: `CASCADE`,
	});
	
	User.hasMany(DashboardConfiguration, {
		as: `dashboardConfigurations`,
		foreignKey: `userId`,
		onDelete: `CASCADE`,
	});
};

const initializeDatabase = async (sequelize: Sequelize) => {
	initializeDashboardConfiguration(sequelize);
	initializePreferences(sequelize);
	initializeSession(sequelize);
	initializeUser(sequelize);

	await sequelize.sync({ alter: true });
};

export default initializeDatabase;
