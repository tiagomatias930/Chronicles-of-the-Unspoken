/**
 * Environment configuration
 * These variables are loaded from .env files and exposed via Vite
 */

const getEnvVariable = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const config = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
};

export const validateEnvironment = (): void => {
  if (!config.geminiApiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY environment variable is not set. ' +
      'Please set it in your .env.local file or Vercel environment variables.'
    );
  }
};
