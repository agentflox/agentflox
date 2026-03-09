/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping requests to failing services
 * and allowing them to recover.
 *
 * Fixes applied (v2):
 *
 * 1. `isOpen()` added — lets callers pre-flight check state without touching
 *    the breaker's failure counter.
 *
 * 2. `execute()` no longer calls `onFailure()` for its own
 *    `CircuitBreakerError` throws (OPEN / HALF_OPEN limit exceeded).
 *    Previously those self-generated throws were caught by the outer `catch`,
 *    which called `onFailure()` and incremented `this.failures`, making the
 *    breaker count its own guards as service failures — a feedback loop that
 *    kept the breaker permanently open.
 *
 * 3. `RetryHandler.retry()` now respects `isRetryable()` by default.
 *    Previously `isRetryable()` existed but was only called when the caller
 *    explicitly passed `options.retryable`. Without it, all 3 retry attempts
 *    were unconditional, so 2 bad OpenAI requests = 6 failure counts (2 × 3),
 *    tripping the old threshold of 5 after just ~1.7 real errors.
 *    Now non-retryable errors (4xx validation, auth) fail fast in 1 attempt,
 *    and retryable errors (429, 5xx, network) are retried with backoff before
 *    a single failure is counted against the breaker.
 *
 * 4. `RetryHandler` skips retries when the error is a `CircuitBreakerError`.
 *    There is no point retrying if the breaker is open — it will throw
 *    immediately every time, and each throw would count as another failure.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxCalls?: number;
  successThreshold?: number;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  retryable?: (error: any) => boolean;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  private halfOpenCalls = 0;
  private halfOpenSuccesses = 0;

  constructor(private options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60_000,
      halfOpenMaxCalls: options.halfOpenMaxCalls ?? 3,
      successThreshold: options.successThreshold ?? 2,
    };
  }

  // ─── Public state inspection ──────────────────────────────────────────────

  /**
   * Returns true when the circuit is OPEN (or HALF_OPEN limit exceeded).
   * Use this as a pre-flight check before calling execute() so that
   * RetryHandler never fires multiple attempts against an open breaker —
   * each such attempt would (wrongly) increment the failure counter.
   */
  isOpen(): boolean {
    if (this.state === 'OPEN') {
      // Check if it's time to transition to HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout!) {
        // Transition happens inside execute(); from the caller's perspective
        // the breaker is still "open" until execute() succeeds.
        return false; // allow the probe call through
      }
      return true;
    }
    return false;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
    this.halfOpenSuccesses = 0;
  }

  // ─── Core execute ─────────────────────────────────────────────────────────

  /**
   * Execute function with circuit breaker protection.
   *
   * KEY FIX: CircuitBreakerError (thrown by THIS method for OPEN / HALF_OPEN
   * limit cases) is re-thrown WITHOUT calling onFailure(). The breaker's own
   * guard errors must not count as service failures — otherwise every OPEN
   * check adds to the failure budget and the breaker can never reset.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout!) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        this.halfOpenSuccesses = 0;
      } else {
        // ← No onFailure() here — this is OUR error, not a service failure.
        throw new CircuitBreakerError(
          'Circuit breaker is OPEN. Service is unavailable.',
          this.state
        );
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls!) {
        this.state = 'OPEN';
        this.lastFailureTime = Date.now();
        // ← No onFailure() here either — same reason.
        throw new CircuitBreakerError(
          'Circuit breaker exceeded half-open call limit.',
          this.state
        );
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      // Only count real service errors, not our own CircuitBreakerErrors.
      if (!(error instanceof CircuitBreakerError)) {
        this.onFailure();
      }
      throw error;
    }
  }

  // ─── Internal state transitions ───────────────────────────────────────────

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.successThreshold!) {
        this.state = 'CLOSED';
        this.halfOpenCalls = 0;
        this.halfOpenSuccesses = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.halfOpenCalls = 0;
      this.halfOpenSuccesses = 0;
    } else if (this.failures >= this.options.failureThreshold!) {
      this.state = 'OPEN';
    }
  }
}

// ─── CircuitBreakerError ──────────────────────────────────────────────────────

export class CircuitBreakerError extends Error {
  constructor(message: string, public state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ─── RetryHandler ─────────────────────────────────────────────────────────────

export class RetryHandler {
  /**
   * Retry a function with exponential backoff.
   *
   * KEY FIX: `isRetryable()` is now always consulted even when the caller
   * does not pass `options.retryable`. Previously, without an explicit
   * `retryable` predicate, ALL errors were retried unconditionally — so a
   * single real OpenAI failure triggered 3 retry attempts, which meant 3
   * `onFailure()` calls against the circuit breaker per request. With a
   * threshold of 5 that meant ~1.7 real errors were enough to open the
   * circuit permanently.
   *
   * Also: CircuitBreakerError is never retried. Retrying against an open
   * breaker is pointless — it throws immediately every time — and each
   * thrown attempt would add to the failure count.
   */
  async retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10_000,
      jitter = true,
    } = options;

    // Caller-supplied predicate takes priority; fall back to built-in classifier.
    const isRetryable = options.retryable ?? this.isRetryable.bind(this);

    let lastError!: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Never retry if the circuit is open — it will throw immediately
        // on every attempt, burning through the failure budget for free.
        if (error instanceof CircuitBreakerError) {
          throw error;
        }

        // Non-retryable errors fail fast (4xx validation, auth, etc.)
        if (!isRetryable(error)) {
          throw error;
        }

        // Don't sleep after the final attempt
        if (attempt < maxAttempts - 1) {
          const delay = this.calculateDelay(attempt, baseDelay, maxDelay, jitter);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, base: number, max: number, jitter: boolean): number {
    const exponential = Math.min(base * Math.pow(2, attempt), max);
    if (jitter) {
      const jitterAmount = exponential * 0.1 * (Math.random() * 2 - 1);
      return Math.max(0, exponential + jitterAmount);
    }
    return exponential;
  }

  /**
   * Default retryability predicate — used when caller doesn't supply one.
   * Retries transient errors (network, 429, 5xx); fails fast on client errors.
   */
  private isRetryable(error: any): boolean {
    if (error instanceof CircuitBreakerError) return false;

    if (error.status === 429 || error.status >= 500) return true;

    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND'
    ) return true;

    if (error.message?.includes('rate limit')) return true;

    // 4xx client errors: validation, auth, bad request — don't retry
    if (error.status >= 400 && error.status < 500) return false;

    return false; // unknown — don't retry by default (conservative)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─── ErrorClassifier ──────────────────────────────────────────────────────────

export class ErrorClassifier {
  classify(error: Error | any): { type: string; recoverable: boolean; retryAfter?: number } {
    // Classify circuit-breaker state errors distinctly so callers can
    // differentiate "service down" from "our own guard tripped".
    if (error instanceof CircuitBreakerError) {
      return { type: 'CIRCUIT_OPEN', recoverable: true, retryAfter: 30 };
    }

    const msg = error.message || String(error);
    const status = error.status || error.statusCode;

    if (status === 429 || msg.includes('rate limit')) {
      return { type: 'RATE_LIMIT', recoverable: true, retryAfter: 60 };
    }
    if (status === 408 || msg.includes('timeout') || error.code === 'ETIMEDOUT') {
      return { type: 'TIMEOUT', recoverable: true, retryAfter: 5 };
    }
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || msg.includes('network')) {
      return { type: 'NETWORK', recoverable: true, retryAfter: 10 };
    }
    if (status === 400 || msg.includes('validation') || msg.includes('invalid')) {
      return { type: 'VALIDATION', recoverable: false };
    }
    if (status === 401 || status === 403) {
      return { type: 'AUTHENTICATION', recoverable: false };
    }
    if (status >= 500) {
      return { type: 'SERVER_ERROR', recoverable: true, retryAfter: 30 };
    }

    // Changed from UNKNOWN/retryable=true to UNKNOWN/retryable=false.
    // Assuming unknown errors are retryable caused the old RetryHandler to
    // retry everything, which was the second contributor to the failure-count blowup.
    return { type: 'UNKNOWN', recoverable: false };
  }
}