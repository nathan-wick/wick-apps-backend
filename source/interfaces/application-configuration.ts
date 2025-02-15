import type { Router } from 'express';

export interface ApplicationConfiguration {
	launchMode: `development` | `production`;
	name: string;
	database: { uri: string };
	port: number;
	routers: { path: string; router: Router }[];
	email: {
		host: string;
		port: number;
		fromAddress: string;
		password: string;
	};
}
