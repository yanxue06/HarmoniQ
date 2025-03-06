import { createClient, Provider } from '@supabase/supabase-js';

// Try to get values from environment variables, fall back to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache for API responses to prevent duplicate calls
const responseCache = new Map<string, {
  timestamp: number;
  response: any;
}>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Improved debounce helper with caching
const debounce = <T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number,
  cacheKey?: string
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

      if (timeSinceLastCall >= wait && !inProgress) {
        lastCall = now;
        inProgress = true;
        
        pendingPromise = func(...args)
          .then(result => {
            // Cache the result if cacheKey is provided
            if (cacheKey) {
              responseCache.set(cacheKey, {
                timestamp: Date.now(),
                response: result
              });
            }
            return result;
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
                  response: result
                });
              }
              return result;
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
  console.log('Calling Supabase signInWithSpotify');
  const options = {
    provider: 'spotify' as Provider,
    options: {
      redirectTo: redirectUrl,
      scopes: 'user-read-email user-read-private user-top-read user-read-recently-played user-read-currently-playing playlist-read-private'
    }
  };
  
  return supabase.auth.signInWithOAuth(options);
};

const _signOut = async () => {
  console.log('Supabase signOut called');
  try {
    const result = await supabase.auth.signOut();
    console.log('Supabase signOut completed:', result);
    return result;
  } catch (error) {
    console.error('Error in supabase signOut:', error);
    throw error;
  }
};

const _getSession = async () => {
  console.log('Calling Supabase getSession');
  return supabase.auth.getSession();
};

// Debounced versions of the functions with appropriate timeouts
export const signInWithSpotify = debounce(_signInWithSpotify, 1000);
export const signOut = debounce(_signOut, 1000);
export const getSession = debounce(_getSession, 1000, 'session');

// Auth state change doesn't need debouncing as it's a subscription
let authChangeListener: any = null;

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  // Ensure we only have one listener active at a time
  if (authChangeListener) {
    console.log('Reusing existing auth state change listener');
    return authChangeListener;
  }
  
  console.log('Setting up new auth state change listener');
  authChangeListener = supabase.auth.onAuthStateChange(callback);
  return authChangeListener;
}; 