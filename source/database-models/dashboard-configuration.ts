import {
	type CreationOptional,
	DataTypes,
	type InferAttributes,
	type InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';

class DashboardConfiguration extends Model<
	InferAttributes<DashboardConfiguration>,
	InferCreationAttributes<DashboardConfiguration>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare dashboard: string;
	declare configuration: string;
}

export const initializeDashboardConfiguration = (sequelize: Sequelize) => {
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

export default DashboardConfiguration;
export interface DashboardConfigurationInput
	extends Omit<DashboardConfiguration, `id`> {}
export interface DashboardConfigurationOutput extends DashboardConfiguration {}
