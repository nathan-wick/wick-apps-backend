import { Model } from 'sequelize';
import type { brightness } from '../constants/brightness.js';
import type { color } from '../constants/color.js';
import type { dateFormat } from '../constants/date-format.js';

class Preferences extends Model {
	public userId!: number;
	public brightness!: brightness;
	public dateFormat!: dateFormat;
	public primaryColor!: color;
}

export default Preferences;
export interface PreferencesInput extends Partial<Preferences> {}
export interface PreferencesOutput extends Preferences {}
