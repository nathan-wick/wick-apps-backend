import { randomInt, } from 'crypto';

const generateRandomWholeNumber = (minimum: number, maximum: number,) => randomInt(minimum, maximum + 1);

export default generateRandomWholeNumber;