export type ExecutionErrorCategory = 'QUOTA' | 'SUBSCRIPTION' | 'RATE';

export class ExecutionQuotaExceededError extends Error {
  readonly category: ExecutionErrorCategory = 'QUOTA';
  readonly statusCode = 402;

  constructor(message = 'Execution quota exhausted') {
    super(message);
    this.name = 'ExecutionQuotaExceededError';
  }
}

export class NoActiveSubscriptionError extends Error {
  readonly category: ExecutionErrorCategory = 'SUBSCRIPTION';
  readonly statusCode = 402;

  constructor(message = 'No active subscription') {
    super(message);
    this.name = 'NoActiveSubscriptionError';
  }
}

export class ConcurrentRunsExceededError extends Error {
  readonly category: ExecutionErrorCategory = 'RATE';
  readonly statusCode = 429;

  constructor(message = 'Concurrent execution limit reached') {
    super(message);
    this.name = 'ConcurrentRunsExceededError';
  }
}
