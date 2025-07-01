import type { NextFunction, Request, Response } from 'express';

export type AsyncRequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => Promise<void | Response>;
