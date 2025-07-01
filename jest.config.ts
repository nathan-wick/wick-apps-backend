import type { Config } from 'jest';

const config: Config = {
	preset: `ts-jest`,
	roots: [`<rootDir>/tests`], 
	testEnvironment: `node`,
};

export default config;
