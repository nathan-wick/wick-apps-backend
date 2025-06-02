import { RequestHandler, Router } from 'express';

export type RouterMethod = (
	path: string,
	...handlers: RequestHandler[]
) => Router;
