import {
	type CreationOptional,
	DataTypes,
	type InferAttributes,
	type InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';
import { type brightness, brightnessValues } from '../constants/brightness';
import { type color, colorValues } from '../constants/color';
import { type dateFormat, dateFormatValues } from '../constants/date-format';

export class PreferencesModel extends Model<
	InferAttributes<PreferencesModel>,
	InferCreationAttributes<PreferencesModel>
> {
	declare userId: CreationOptional<number>;
	declare brightness: brightness;
	declare dateFormat: dateFormat;
	declare primaryColor: color;
}

export const initializePreferencesModel = (sequelize: Sequelize) => {
	PreferencesModel.init(
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

export default PreferencesModel;
