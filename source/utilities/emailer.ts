import { applicationConfiguration, emailTransporter } from './application';
import type { HttpStatus } from '../interfaces/http-status';

export interface EmailOptions {
	to: string;
	subject: string;
	text: string;
	html?: string;
}

export abstract class Emailer {
	public static async send(options: EmailOptions): Promise<void> {
		if (!Emailer.addressIsValid(options.to)) {
			const error: HttpStatus = {
				code: 400,
				message: `Cannot send email to an invalid address.`,
			};
			throw error;
		}
		try {
			const email = {
				from: `"${applicationConfiguration.name}" <${applicationConfiguration.email.fromAddress}>`,
				html: options.html,
				subject: options.subject,
				text: options.text,
				to: options.to,
			};
			await emailTransporter.sendMail(email);
		} catch (_error) {
			const error: HttpStatus = {
				code: 401,
				message: `Failed to send email.`,
			};
			throw error;
		}
	}

	public static addressIsValid(address: string) {
		const validEmailRegex: RegExp =
			/^[\w-]+(?:\.[\w-]+)*@[\w-]+(?:\.[\w-]+)+$/u;
		return address && validEmailRegex.test(address);
	}
}
