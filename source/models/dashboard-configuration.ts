import {
	type CreationOptional,
	DataTypes,
	type InferAttributes,
	type InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';

export class DashboardConfigurationModel extends Model<
	InferAttributes<DashboardConfigurationModel>,
	InferCreationAttributes<DashboardConfigurationModel>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare dashboard: string;
	declare configuration: string;
}

export const initializeDashboardConfigurationModel = (sequelize: Sequelize) => {
	DashboardConfigurationModel.init(
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

export default DashboardConfigurationModel;
