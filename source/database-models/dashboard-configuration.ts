import { Model, } from "sequelize";

class DashboardConfiguration extends Model {
    public id!: number;
    public userId!: number;
    public dashboard!: string;
    public configuration!: string;
}

export default DashboardConfiguration;
export interface DashboardConfigurationInput extends Partial<DashboardConfiguration> {}
export interface DashboardConfigurationOutput extends DashboardConfiguration {}