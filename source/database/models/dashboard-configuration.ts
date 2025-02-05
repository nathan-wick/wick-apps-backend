import { DataTypes, Model, } from "sequelize";
import sequelize from "../sequelize";

class DashboardConfiguration extends Model {
    public id!: number;
    public userId!: number;
    public dashboard!: string;
    public configuration!: string;
}

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
    { sequelize, }
);

export default DashboardConfiguration;
export interface DashboardConfigurationInput extends Partial<DashboardConfiguration> {}
export interface DashboardConfigurationOutput extends DashboardConfiguration {}