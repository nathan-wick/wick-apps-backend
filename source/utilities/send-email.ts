import {
	applicationConfiguration,
	emailTransporter,
} from '../start-application.js';
import type { EmailOptions } from '../interfaces/email-options.js';

export const sendEmail = async (emailOptions: EmailOptions): Promise<void> => {
	try {
		const email = {
			from: `"${applicationConfiguration.name}" <${applicationConfiguration.email.fromAddress}>`,
			html: emailOptions.html,
			subject: emailOptions.subject,
			text: emailOptions.text,
			to: emailOptions.to,
		};
		await emailTransporter.sendMail(email);
	} catch (error) {
		if (applicationConfiguration.launchMode === `development`) {
			// eslint-disable-next-line no-console
			console.error(`Error sending email:`, error);
		}
	}
};
