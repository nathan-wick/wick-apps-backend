import { DataTypes, Model, } from "sequelize";
import DashboardConfiguration from "./dashboard-configuration";
import Preferences from "./preferences";
import Session from "./session";
import sequelize from "../sequelize";

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

export default User;
export interface UserInput extends Partial<User> {}
export interface UserOutput extends User {}