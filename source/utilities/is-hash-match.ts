import { compare } from 'bcrypt';

const isHashMatch = async (plain: string, hash: string) =>
	await compare(plain, hash);

export default isHashMatch;
