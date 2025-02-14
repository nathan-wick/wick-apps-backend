import {
	type CreationOptional,
	DataTypes,
	type InferAttributes,
	type InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';

class Session extends Model<
	InferAttributes<Session>,
	InferCreationAttributes<Session>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare code: string;
	declare successfulAttempts: number;
	declare failedAttempts: number;
	declare started: Date;
	declare expires: Date;
	declare device: string;
	declare location: string;
}

export const initializeSession = (sequelize: Sequelize) => {
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

export default Session;
export interface SessionInput extends Partial<Session> {}
export interface SessionOutput
	extends Pick<Session, `started` | `device` | `location` | `expires`> {}
