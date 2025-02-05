import { DataTypes, Model, } from "sequelize";
import sequelize from "../sequelize";

class Session extends Model {
    public id!: number;
    public userId!: number;
    public code!: string;
    public successfulAttempts!: number;
    public failedAttempts!: number;
    public started!: Date;
    public expires!: Date;
    public device!: string;
    public location!: string;
}

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
    { sequelize, }
);

export default Session;
export interface SessionInput extends Partial<Session> {}
export interface SessionOutput extends Pick<Session, `started` | `device` | `location` | `expires`> {}