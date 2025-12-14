import { hash as bcryptHash, compare } from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import geoip from 'geoip-lite';
import { parse } from 'useragent';

export class Shield {
	public static generateRandomCode(
		minimumLength: number = 3,
		maximumLength: number = 5,
	) {
		const length = this.generateRandomWholeNumber(
			minimumLength,
			maximumLength,
		);
		const digits = `123456789`;
		let code = ``;
		for (let index = 0; index < length; index++) {
			const digitIndex = randomInt(0, digits.length);
			code += digits[digitIndex];
		}
		return code;
	}

	public static generateRandomKey(length: number = 256) {
		return randomBytes(length).toString(`hex`).slice(0, length);
	}

	public static generateRandomWholeNumber(minimum: number, maximum: number) {
		return randomInt(minimum, maximum + 1);
	}

	public static getLocationFromIp(ipAddress?: string) {
		const unknownLocation = `Unknown`;
		if (!ipAddress) {
			return unknownLocation;
		}
		const geo = geoip.lookup(ipAddress);
		if (!geo) {
			return unknownLocation;
		}
		const location = `${geo.city}, ${geo.region}, ${geo.country}`;
		return location;
	}

	public static async hash(value: string, saltRounds: number = 12) {
		return await bcryptHash(value, saltRounds);
	}

	public static async isHashMatch(value: string, hash: string) {
		return await compare(value, hash);
	}

	public static simplifyUserAgent(userAgent?: string) {
		const unknownUserAgent = `Unknown`;
		if (!userAgent) {
			return unknownUserAgent;
		}
		const parsedUserAgent = parse(userAgent);
		const simplifiedUserAgent = `${parsedUserAgent.family}`;
		return simplifiedUserAgent;
	}
}
