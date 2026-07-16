# Implementation Plan - Stripe ID-Based Subscription Matching

This plan details the changes needed to support direct ID-based user activation when Stripe payments are made, resolving the email mismatch issue.

## User Review Required

> [!IMPORTANT]
> The frontend application must be updated to append `?client_reference_id=USER_MONGO_ID` (and optionally `?prefilled_email=USER_EMAIL`) to the Stripe Payment Links when redirecting the user to Stripe Checkout.
> 
> Example:
> `https://buy.stripe.com/test_xxxxxx?client_reference_id=60c72b2f9b1d8a23c8928421&prefilled_email=user@example.com`

## Proposed Changes

We will register the `checkout.session.completed` event in the Stripe Webhook handler and create a session handler that uses `client_reference_id` to activate the user's subscription. We will also update `handleSubscriptionCreated.ts` to log a warning instead of failing if the email doesn't match.

---

### [handlers] (c:\Users\Betopia\Desktop\Mahabub Office Project\project\engsports\src\handlers)

#### [NEW] [handleCheckoutSessionCompleted.ts](file:///c:/Users/Betopia/Desktop/Mahabub%20Office%20Project/project/engsports/src/handlers/handleCheckoutSessionCompleted.ts)
Implement `handleCheckoutSessionCompleted` to:
- Retrieve `client_reference_id` (the MongoDB user ID).
- Look up the user directly by `_id`.
- Look up the Stripe subscription and package.
- Provision the subscription in our database and update user status (activate subscription).

#### [MODIFY] [handleSubscriptionCreated.ts](file:///c:/Users/Betopia/Desktop/Mahabub%20Office%20Project/project/engsports/src/handlers/handleSubscriptionCreated.ts)
Modify the email lookup logic so that if the user is not found by email, it logs a warning and returns early instead of throwing a 404/500 API error. This allows `handleCheckoutSessionCompleted` to safely handle the subscription activation.

#### [NEW] [index.ts](file:///c:/Users/Betopia/Desktop/Mahabub%20Office%20Project/project/engsports/src/handlers/index.ts)
Export `handleCheckoutSessionCompleted` from the handlers directory.

---

### [helpers] (c:\Users\Betopia\Desktop\Mahabub Office Project\project\engsports\src\helpers)

#### [MODIFY] [handleStripeWebhook.ts](file:///c:/Users/Betopia/Desktop/Mahabub%20Office%20Project/project/engsports/src/helpers/handleStripeWebhook.ts)
Import `handleCheckoutSessionCompleted` and register the `"checkout.session.completed"` webhook event:
```typescript
case "checkout.session.completed":
  await handleCheckoutSessionCompleted(data);
  break;
```

## Verification Plan

### Manual Verification
- We will verify that all files compile cleanly and no syntax errors are introduced.
