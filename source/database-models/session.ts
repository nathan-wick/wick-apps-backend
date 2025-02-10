import { Model } from 'sequelize';

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

export default Session;
export interface SessionInput extends Partial<Session> {}
export interface SessionOutput
	extends Pick<Session, `started` | `device` | `location` | `expires`> {}
