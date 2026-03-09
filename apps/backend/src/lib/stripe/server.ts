import Stripe from 'stripe';
import { env } from '@/config/env';

if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover"
}); 