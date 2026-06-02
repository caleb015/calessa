/**
 * Generic App Configuration
 * Customize these for your project
 */

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'My App',
  subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE || 'Welcome',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
};
