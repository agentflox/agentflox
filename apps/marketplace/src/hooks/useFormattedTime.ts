import { useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function useFormattedTime(createdAt: string | Date) {
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    // Always parse consistently
    const date =
      typeof createdAt === 'string' ? parseISO(createdAt) : new Date(createdAt);

    // Compute on the client to avoid hydration mismatch
    setFormattedTime(formatDistanceToNow(date, { addSuffix: true }));

    // Optionally, re-render every minute to keep it fresh
    const interval = setInterval(() => {
      setFormattedTime(formatDistanceToNow(date, { addSuffix: true }));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return formattedTime;
}
