import { hash as bcryptHash, } from 'bcrypt';

const hash = async (value: string, saltRounds: number = 12) => await bcryptHash(value, saltRounds);

export default hash;