import { HttpStatus, } from "../interfaces/http-status";

const throwError = (code: number, message: string) => {
    const error: HttpStatus = {
        code,
        message,
    };
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
};

export default throwError;