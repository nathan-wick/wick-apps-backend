import { Model, } from "sequelize";
import { brightness, } from "../constants/brightness";
import { color, } from "../constants/color";
import { dateFormat, } from "../constants/date-format";

class Preferences extends Model {
    public userId!: number;
    public brightness!: brightness;
    public dateFormat!: dateFormat;
    public primaryColor!: color;
}

export default Preferences;
export interface PreferencesInput extends Partial<Preferences> {}
export interface PreferencesOutput extends Preferences {}