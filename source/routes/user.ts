import { Request, Response, Router, } from "express";
import User, { UserInput, } from "../database-models/user";
import Preferences from "../database-models/preferences";
import { RequestValidationOutput, } from "../interfaces/request-validation-output";
import runRequest from "../utilities/run-request";
import { smallFileBytes, } from "../constants/file-sizes";
import throwError from "../utilities/throw-error";

const userRoute = Router();

userRoute.get(`/`, async (request: Request, response: Response) => {
    await runRequest(
        {
            request,
            response,
        },
        {
            sessionTokenIsRequired: true,
        },
        async (requestValidationOutput: RequestValidationOutput) => {
            // TODO Add fields conditionally
            const user = await User.findByPk(requestValidationOutput.userId, {
                include: [{
                    as: `preferences`,
                    model: Preferences,
                    required: false,
                },],
            });
            if (!user) {
                throwError(404, `User not found.`);
            }
            return user!;
        },
    );
});

userRoute.put(`/`, async (request: Request, response: Response) => {
    await runRequest(
        {
            request,
            response,
        },
        {
            sessionTokenIsRequired: true,
        },
        async (requestValidationOutput: RequestValidationOutput) => {
            const { email, ...updateData }: UserInput = request.body;
            if (!requestValidationOutput.userId) {
                throwError(400, `ID is required.`);
            }
            const user = await User.findByPk(requestValidationOutput.userId);
            if (!user) {
                throwError(404, `User not found.`);
            }
            if (email && email !== user!.email)  {
                throwError(400, `Email cannot be changed.`);
            }
            // TODO Replace with an accurate way to check picture size
            if (updateData.picture && updateData.picture.length > smallFileBytes) {
                throwError(400, `Picture is too large.`);
            }
            const updatedUser = await user!.update(updateData);
            return updatedUser;
        },
    );
});

export default userRoute;