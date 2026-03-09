import { useEffect, useState } from "react";

/**
 * useDebounce - Delays updating a value until after a specified delay.
 * 
 * @param value - The value to debounce.
 * @param delayMs - The delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
