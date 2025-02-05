import { DataTypes, Model, } from "sequelize";
import { brightness, brightnessValues, } from "../../constants/brightness";
import { color, colorValues, } from "../../constants/color";
import { dateFormat, dateFormatValues, } from "../../constants/date-format";
import sequelize from "../sequelize";

class Preferences extends Model {
    public userId!: number;
    public brightness!: brightness;
    public dateFormat!: dateFormat;
    public primaryColor!: color;
}

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
    { sequelize, }
);

export default Preferences;
export interface PreferencesInput extends Partial<Preferences> {}
export interface PreferencesOutput extends Preferences {}