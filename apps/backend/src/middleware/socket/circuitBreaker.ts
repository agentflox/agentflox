import CircuitBreaker from 'opossum';

export function createSocketCircuitBreaker<T>(
    fn: (...args: any[]) => Promise<T>,
    options = {}
) {
    const breaker = new CircuitBreaker(fn, {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        ...options
    });

    breaker.on('open', () => {
        console.error('Circuit breaker opened:', fn.name);
    });

    breaker.on('halfOpen', () => {
        console.warn('Circuit breaker half-open, testing:', fn.name);
    });

    return breaker;
}
