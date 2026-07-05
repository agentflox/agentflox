export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const ROUTES = {
    LOGIN: `${APP_URL}/login`,
    SIGNUP: `${APP_URL}/signup`,
    DASHBOARD: `${APP_URL}/dashboard`,
};
