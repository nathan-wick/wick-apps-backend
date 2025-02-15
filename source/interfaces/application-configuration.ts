import type { Router } from "express";
import type { Sequelize } from "sequelize";

export interface ApplicationConfiguration {
	database: Sequelize;
    port: number;
    routers: { path: string; router: Router; }[];
}
