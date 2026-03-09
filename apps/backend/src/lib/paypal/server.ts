import {
    Client,
    Environment,
    LogLevel,
} from "@paypal/paypal-server-sdk";
import { env } from '@/config/env';

if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not defined in environment variables');
}

export const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: env.PAYPAL_CLIENT_ID!,
        oAuthClientSecret: env.PAYPAL_CLIENT_SECRET!,
    },
    environment:
        env.NODE_ENV === "production"
            ? Environment.Production
            : Environment.Sandbox,
    timeout: 0,
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});
