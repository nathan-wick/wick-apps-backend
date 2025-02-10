import throwError from './throw-error';

const validateEmail = (email: string) => {
	// eslint-disable-next-line prefer-named-capture-group, require-unicode-regexp
	const emailRegex: RegExp = /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/;

	if (!email || !emailRegex.test(email)) {
		throwError(
			400,
			`The email address you've provided is invalid. Please provide a valid email address.`,
		);
	}
};

export default validateEmail;
