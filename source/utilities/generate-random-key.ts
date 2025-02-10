import { randomBytes } from 'crypto';

const generateRandomKey = (length: number = 256) =>
	randomBytes(length).toString(`hex`).slice(0, length);

export default generateRandomKey;
