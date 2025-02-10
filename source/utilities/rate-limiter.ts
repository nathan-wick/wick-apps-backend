export default class RateLimiter {
	private static millisecondsPerMinute = 60000;

	private maxRequestsPerHour = 1000;
	private maxRequestsPerMinute = 50;
	private blockDurationInMinutes = 15;

	private requestTracker: Map<string, number[]> = new Map();
	private blockedKeys: Map<string, number> = new Map();

	private static filterOldRequests(
		requests: number[],
		currentTime: number,
		windowInMinutes: number,
	): number[] {
		return requests.filter(
			(timestamp) =>
				currentTime - timestamp <
				windowInMinutes * RateLimiter.millisecondsPerMinute,
		);
	}

	checkIfKeyIsBlocked(key: string): boolean {
		const currentTime = Date.now();
		const keyIsBlocked = this.blockedKeys.get(key);

		if (keyIsBlocked) {
			const blockHasExpired = currentTime > keyIsBlocked;

			if (!blockHasExpired) {
				return true;
			}
		}

		const allRequests = this.requestTracker.get(key) || [];
		const requestsThisHour = RateLimiter.filterOldRequests(
			allRequests,
			currentTime,
			60,
		);
		const requestsThisMinute = RateLimiter.filterOldRequests(
			requestsThisHour,
			currentTime,
			1,
		);

		if (
			requestsThisMinute.length > this.maxRequestsPerMinute ||
			requestsThisHour.length > this.maxRequestsPerHour
		) {
			this.blockedKeys.set(
				key,
				currentTime +
					this.blockDurationInMinutes *
						RateLimiter.millisecondsPerMinute,
			);

			return true;
		}

		requestsThisHour.push(currentTime);
		this.requestTracker.set(key, requestsThisHour);

		return false;
	}

	startCleanupInterval(intervalInMinutes: number = 5): NodeJS.Timeout {
		const cleanupRequestTracker = (currentTime: number) => {
			for (const [key, requests] of this.requestTracker.entries()) {
				const requestsThisHour = RateLimiter.filterOldRequests(
					requests,
					currentTime,
					60,
				);

				if (requestsThisHour.length === 0) {
					this.requestTracker.delete(key);
				} else {
					this.requestTracker.set(key, requestsThisHour);
				}
			}
		};

		const cleanupBlockedKeys = (currentTime: number) => {
			for (const [key, expiry] of this.blockedKeys.entries()) {
				if (currentTime >= expiry) {
					this.blockedKeys.delete(key);
				}
			}
		};

		return setInterval(() => {
			const currentTime = Date.now();

			cleanupRequestTracker(currentTime);
			cleanupBlockedKeys(currentTime);
		}, intervalInMinutes * RateLimiter.millisecondsPerMinute);
	}
}
