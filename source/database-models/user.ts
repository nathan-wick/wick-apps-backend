import DashboardConfiguration from "./dashboard-configuration";
import { Model, } from "sequelize";
import Preferences from "./preferences";
import Session from "./session";

class User extends Model {
    public id!: number;
    public email!: string;
    public picture!: string | null;
    public firstName!: string | null;
    public lastName!: string | null;
    public birthday!: Date | null;
    public sessions?: Session[];
    public preferences?: Preferences;
    public dashboardConfigurations?: DashboardConfiguration[];
}

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

export default User;
export interface UserInput extends Partial<User> {}
export interface UserOutput extends User {}