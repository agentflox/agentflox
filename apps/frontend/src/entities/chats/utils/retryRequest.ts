export const retry = async <T,>(
  fn: () => Promise<T>, 
  attempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return retry(fn, attempts - 1, delayMs);
  }
};
