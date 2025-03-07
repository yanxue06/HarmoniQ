// src/lib/supabase.ts
import { createClient, Provider } from '@supabase/supabase-js';

// Try to get values from environment variables, fall back to hardcoded values with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided via environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)');
}

// Create a single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache for API responses to prevent duplicate calls
const responseCache = new Map<string, {
  timestamp: number;
  response: any;
}>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Improved debounce helper with caching and option to bypass delay
const debounce = <T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number,
  cacheKey?: string,
  bypassDelay?: boolean
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCall = 0;
  let inProgress = false;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Check cache if cacheKey is provided
    if (cacheKey) {
      const cacheEntry = responseCache.get(cacheKey);
      if (cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_EXPIRATION) {
        console.log(`Using cached response for ${cacheKey}`);
        return cacheEntry.response;
      }
    }

    // If a call is already in progress, return the pending promise
    if (inProgress && pendingPromise) {
      console.log('Request already in progress, returning pending promise');
      return pendingPromise;
    }

    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    return new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (bypassDelay || timeSinceLastCall >= wait) {
        lastCall = now;
        inProgress = true;

        pendingPromise = func(...args)
          .then(result => {
            // Cache the result if cacheKey is provided
            if (cacheKey) {
              responseCache.set(cacheKey, {
                timestamp: Date.now(),
                response: result,
              });
            }
            return result;
          })
          .catch(err => {
            console.error(`Error in debounced function: ${err.message}`);
            throw err;
          })
          .finally(() => {
            inProgress = false;
            pendingPromise = null;
          });

        resolve(pendingPromise);
      } else {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          inProgress = true;

          pendingPromise = func(...args)
            .then(result => {
              // Cache the result if cacheKey is provided
              if (cacheKey) {
                responseCache.set(cacheKey, {
                  timestamp: Date.now(),
                  response: result,
                });
              }
              return result;
            })
            .catch(err => {
              console.error(`Error in debounced function: ${err.message}`);
              throw err;
            })
            .finally(() => {
              inProgress = false;
              pendingPromise = null;
            });

          resolve(pendingPromise);
        }, Math.max(0, wait - timeSinceLastCall));
      }
    });
  };
};

// Helper functions for authentication
const _signInWithSpotify = async (redirectUrl?: string) => {
  console.log('Calling Supabase signInWithSpotify with redirect URL:', redirectUrl);
  const options = {
    provider: 'spotify' as Provider,
    options: {
      redirectTo: redirectUrl,
      scopes: 'user-read-email user-read-private user-top-read user-read-recently-played user-read-currently-playing playlist-read-private',
    },
  };

  const { data, error } = await supabase.auth.signInWithOAuth(options);
  if (error) {
    console.error('SignInWithSpotify error:', error.message);
    throw error;
  }
  console.log('SignInWithSpotify response:', data);
  return { data, error };
};

const _signOut = async () => {
  console.log('Supabase signOut called');
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('SignOut error:', error.message);
      throw error;
    }
    console.log('Supabase signOut completed');
    return { error };
  } catch (error) {
    console.error('Error in supabase signOut:', error);
    throw error;
  }
};

const _getSession = async () => {
  console.log('Calling Supabase getSession');
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('GetSession error:', error.message);
    throw error;
  }
  console.log('GetSession response:', data);
  return { data, error };
};

// Debounced versions with bypassDelay for signInWithSpotify
export const signInWithSpotify = debounce(_signInWithSpotify, 1000, undefined, true); // Bypass delay for redirect
export const signOut = debounce(_signOut, 1000);
export const getSession = debounce(_getSession, 1000, 'session');

// Auth state change doesn't need debouncing as it's a subscription
let authChangeListener: any = null;

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  if (authChangeListener) {
    console.log('Reusing existing auth state change listener');
    return authChangeListener;
  }

  console.log('Setting up new auth state change listener');
  authChangeListener = supabase.auth.onAuthStateChange(callback);
  return authChangeListener;
};