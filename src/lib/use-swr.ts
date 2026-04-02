import type { SWRConfiguration } from 'swr';

/**
 * Shared fetcher for useSWR calls
 * Handles JSON responses and throws errors for non-OK responses
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return res.json();
};

/**
 * Shared SWR configuration with consistent revalidation settings
 * - revalidateOnFocus: true (refresh when tab regains focus)
 * - revalidateOnReconnect: true (refresh when network reconnects)
 * - dedupingInterval: 5000ms (prevent duplicate requests within 5s)
 * - focusThrottleInterval: 60000ms (throttle focus-triggered refreshes)
 */
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  focusThrottleInterval: 60000,
};