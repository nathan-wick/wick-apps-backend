import { Application } from '../../../source';
import request from 'supertest';
import { testApplicationConfiguration } from '../../helpers/application-configuration';

describe(`Rate Limiter`, () => {
	const millisecondsPerHour = 3600000;

    beforeEach(async () => {
		jest.useFakeTimers();
	});
    afterEach(async () => {
		jest.useRealTimers();
	});

	test(`allows requests under the limit`, async () => {
        const application = new Application(testApplicationConfiguration);
        await application.start();
		const response = await request(application.express).get(`/test`);
		expect(response.status).toBe(200);
        await application.stop();
	});

    test(`blocks requests after exceeding burst threshold`, async () => {
        const application = new Application(testApplicationConfiguration);
        await application.start();
        const {burstThreshold} = testApplicationConfiguration.rateLimiterOptions!;
        for (let iteration = 0; iteration < burstThreshold; iteration++) {
			const response = await request(application.express).get(`/test`);
		    expect(response.status).toBe(200);
		}
		const response = await request(application.express).get(`/test`);
		expect(response.status).toBe(429);
        await application.stop();
	});

    test(`blocks requests after exceeding per-hour threshold`, async () => {
        const application = new Application(testApplicationConfiguration);
        await application.start();
        const {maxRequestsPerHour} = testApplicationConfiguration.rateLimiterOptions!;
        for (let iteration = 1; iteration < maxRequestsPerHour; iteration++) {
            jest.advanceTimersByTime(millisecondsPerHour / maxRequestsPerHour);
			const response = await request(application.express).get(`/test`);
		    expect(response.status).toBe(200);
		}
		const response = await request(application.express).get(`/test`);
		expect(response.status).toBe(429);
        await application.stop();
	});
});
