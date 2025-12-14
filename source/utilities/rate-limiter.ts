import type { NextFunction, Request, Response } from 'express';
import type { HttpStatus } from '../interfaces/http-status';
import { createHash } from 'crypto';

export interface RateLimiterOptions {
	autoScaleLimits: boolean;
	blockDurationInMinutes: number;
	burstThreshold: number;
	cleanupIntervalInMinutes: number;
	enableTosProtection: boolean;
	maxRequestsPerHour: number;
	maxRequestsPerMinute: number;
	maxRequestsPerSecond: number;
	responseStatusCode: number;
}

export const defaultRateLimiterOptions: RateLimiterOptions = {
	autoScaleLimits: true,
	blockDurationInMinutes: 10,
	burstThreshold: 10,
	cleanupIntervalInMinutes: 10,
	enableTosProtection: true,
	maxRequestsPerHour: 10000,
	maxRequestsPerMinute: 1000,
	maxRequestsPerSecond: 100,
	responseStatusCode: 429,
};

interface RequestData {
	timestamps: number[];
	bursts: number;
	totalRequests: number;
	firstSeen: number;
}

export default class RateLimiter {
	private static millisecondsPerSecond = 1000;
	private static millisecondsPerMinute = 60000;
	private static millisecondsPerHour = 3600000;

	private options: RateLimiterOptions;
	private requestData: Map<string, RequestData> = new Map();
	private blockedKeys: Map<string, number> = new Map();
	private suspiciousKeys: Map<string, number> = new Map();
	private cleanupInterval: NodeJS.Timeout | null = null;
	private serverLoadMonitor: NodeJS.Timeout | null = null;
	private serverLoad: number = 0;

	constructor(options?: RateLimiterOptions) {
		this.options = {
			...defaultRateLimiterOptions,
			...options,
		};
	}

	public middleware() {
		const validateRequest = (
			request: Request,
			response: Response,
			next: NextFunction,
		) => {
			if (this.isBlocked(request)) {
				return this.handleBlocked(request, response);
			}
			this.recordRequest(request);
			if (this.isViolatingRateLimit(request)) {
				return this.handleBlocked(request, response);
			}
			return next();
		};
		return validateRequest;
	}

	public isBlocked(request: Request): boolean {
		const key = this.getKeyFromRequest(request);
		const currentTime = Date.now();
		const blockExpiry = this.blockedKeys.get(key);
		if (blockExpiry && currentTime < blockExpiry) {
			return true;
		}
		const suspiciousExpiry = this.suspiciousKeys.get(key);
		if (suspiciousExpiry && currentTime < suspiciousExpiry) {
			this.blockedKeys.set(
				key,
				currentTime +
					this.options.blockDurationInMinutes *
						2 *
						RateLimiter.millisecondsPerMinute,
			);
			return true;
		}
		return false;
	}

	public recordRequest(request: Request): void {
		const key = this.getKeyFromRequest(request);
		const currentTime = Date.now();
		const data = this.requestData.get(key) || {
			bursts: 0,
			firstSeen: currentTime,
			timestamps: [],
			totalRequests: 0,
		};
		data.timestamps.push(currentTime);
		data.totalRequests++;
		const lastSecondRequests = data.timestamps.filter(
			(timestamp) =>
				currentTime - timestamp < RateLimiter.millisecondsPerSecond,
		).length;
		if (lastSecondRequests >= this.options.burstThreshold) {
			data.bursts++;
			if (data.bursts >= 3) {
				this.markSuspicious(key, currentTime);
			}
		}
		this.requestData.set(key, data);
	}

	public blockRequestSource(
		request: Request,
		durationMinutes?: number,
	): void {
		const key = this.getKeyFromRequest(request);
		const currentTime = Date.now();
		const blockDuration =
			durationMinutes || this.options.blockDurationInMinutes;
		this.blockedKeys.set(
			key,
			currentTime + blockDuration * RateLimiter.millisecondsPerMinute,
		);
	}

	public isViolatingRateLimit(request: Request): boolean {
		const key = this.getKeyFromRequest(request);
		const data = this.requestData.get(key);
		if (!data) {
			return false;
		}
		const currentTime = Date.now();
		const dynamicFactor = this.options.autoScaleLimits
			? Math.max(0.5, 1 - this.serverLoad / 100)
			: 1;
		const adjustedMaxPerSecond = Math.floor(
			this.options.maxRequestsPerSecond * dynamicFactor,
		);
		const adjustedMaxPerMinute = Math.floor(
			this.options.maxRequestsPerMinute * dynamicFactor,
		);
		const adjustedMaxPerHour = Math.floor(
			this.options.maxRequestsPerHour * dynamicFactor,
		);
		const requestsLastSecond = data.timestamps.filter(
			(timestamp) =>
				currentTime - timestamp < RateLimiter.millisecondsPerSecond,
		).length;
		const requestsLastMinute = data.timestamps.filter(
			(timestamp) =>
				currentTime - timestamp < RateLimiter.millisecondsPerMinute,
		).length;
		const requestsLastHour = data.timestamps.filter(
			(timestamp) =>
				currentTime - timestamp < RateLimiter.millisecondsPerHour,
		).length;
		if (this.options.enableTosProtection) {
			const newAccountHighVolume =
				currentTime - data.firstSeen <
					RateLimiter.millisecondsPerMinute * 5 &&
				requestsLastMinute > adjustedMaxPerMinute * 0.8;
			const sustainedHighLoad =
				requestsLastHour > adjustedMaxPerHour * 0.9 &&
				requestsLastMinute > adjustedMaxPerMinute * 0.9;
			if (newAccountHighVolume || sustainedHighLoad || data.bursts >= 2) {
				this.markSuspicious(key, currentTime);
				return true;
			}
		}
		if (
			requestsLastSecond > adjustedMaxPerSecond ||
			requestsLastMinute > adjustedMaxPerMinute ||
			requestsLastHour > adjustedMaxPerHour
		) {
			this.blockRequestSource(request);
			return true;
		}
		return false;
	}

	public startOpenHandles(): void {
		this.cleanupInterval = this.startCleanup(
			this.options.cleanupIntervalInMinutes,
		);
		this.serverLoadMonitor = this.monitorServerLoad();
	}

	public stopOpenHandles(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		if (this.serverLoadMonitor) {
			clearInterval(this.serverLoadMonitor);
		}
	}

	private markSuspicious(key: string, currentTime: number): void {
		const suspensionTime =
			currentTime + 5 * RateLimiter.millisecondsPerMinute;
		this.suspiciousKeys.set(key, suspensionTime);
	}

	private handleBlocked(request: Request, response: Response): void {
		const error: HttpStatus = {
			code: this.options.responseStatusCode,
			message: `Rate limit exceeded. Please try again later.`,
		};
		response.status(this.options.responseStatusCode).send(error);
	}

	private getKeyFromRequest(request: Request): string {
		/**
		 * TODO User-Agent and ip address can be spoofed.
		 * Implement tiered rate limiting, progressive blocking, and pattern detection
		 * to better protect against ddos attacks.
		 */
		const ip = request.ip || `unknown`;
		const userAgent = request.get(`User-Agent`) || `unknown`;
		const data = `${ip}:${userAgent}`;
		return createHash(`sha256`).update(data).digest(`hex`);
	}

	private startCleanup(intervalInMinutes: number): NodeJS.Timeout {
		return setInterval(() => {
			const currentTime = Date.now();
			this.cleanupRequestData(currentTime);
			this.cleanupBlockedKeys(currentTime);
			this.cleanupSuspiciousKeys(currentTime);
		}, intervalInMinutes * RateLimiter.millisecondsPerMinute);
	}

	private cleanupRequestData(currentTime: number): void {
		for (const [key, data] of this.requestData.entries()) {
			data.timestamps = data.timestamps.filter(
				(timestamp) =>
					currentTime - timestamp < RateLimiter.millisecondsPerHour,
			);
			if (data.timestamps.length === 0) {
				this.requestData.delete(key);
			} else {
				this.requestData.set(key, data);
			}
		}
	}

	private cleanupBlockedKeys(currentTime: number): void {
		for (const [key, expiry] of this.blockedKeys.entries()) {
			if (currentTime >= expiry) {
				this.blockedKeys.delete(key);
			}
		}
	}

	private cleanupSuspiciousKeys(currentTime: number): void {
		for (const [key, expiry] of this.suspiciousKeys.entries()) {
			if (currentTime >= expiry) {
				this.suspiciousKeys.delete(key);
			}
		}
	}

	private monitorServerLoad(): NodeJS.Timeout | null {
		if (!this.options.autoScaleLimits) {
			return null;
		}

		try {
			return setInterval(() => {
				if (typeof process !== `undefined` && process.cpuUsage) {
					const startUsage = process.cpuUsage();
					setTimeout(() => {
						const endUsage = process.cpuUsage(startUsage);
						const totalUsage = endUsage.user + endUsage.system;
						this.serverLoad = Math.min(100, totalUsage / 1000);
					}, 100);
				}
			}, 5000);
		} catch (error) {
			this.serverLoad = 0;
			return null;
		}
	}
}
