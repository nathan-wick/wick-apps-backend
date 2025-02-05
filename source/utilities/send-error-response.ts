import { HttpStatus, } from "../interfaces/http-status";
import { Response, } from "express";

const sendErrorResponse = (
    response: Response,
    error: HttpStatus,
) => {
    if (!response.headersSent) {
        response.status(error.code ?? 500).send({ message: error.message ?? `Unexpected error.`, });
    }
};

export default sendErrorResponse;