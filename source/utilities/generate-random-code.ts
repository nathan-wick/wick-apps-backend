import generateRandomWholeNumber from './generate-random-whole-number';

const generateRandomCode = (
	minimumLength: number = 4,
	maximumLength: number = 7,
) => {
	const length = generateRandomWholeNumber(minimumLength, maximumLength);
	const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
	const max = 10 ** length;
	const code = randomNumber % max;
	return code.toString().padStart(length, `0`);
};

export default generateRandomCode;
