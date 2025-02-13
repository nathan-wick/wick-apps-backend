import DashboardConfiguration from './dashboard-configuration.js';
import { Model } from 'sequelize';
import Preferences from './preferences.js';
import Session from './session.js';

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

export default User;
export interface UserInput extends Partial<User> {}
export interface UserOutput extends User {}
