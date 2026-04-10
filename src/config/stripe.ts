import Stripe from 'stripe';
import config from '.';

const stripe = new Stripe(config.stripe.stripeSecretKey as string, {
    apiVersion: '2024-06-20',
});

export default stripe;