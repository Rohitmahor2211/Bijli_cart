# bijliKart SMS and notification flow

Real SMS delivery is disabled by default. The application writes notification
events to the database and logs safe delivery details to the terminal. A real
provider is used only when `NODE_ENV=production`, `SMS_DELIVERY_ENABLED=true`,
and a valid provider configuration is present.

## Purchase flow

For a successful payment capture, the current implementation creates these
events:

| Recipient | Event | SMS count |
| --- | --- | ---: |
| Seller | New order | 1 |
| Seller | Payment received | 1 |
| Buyer | Payment debited | 1 |
| Buyer | Order confirmed | 1 |
| Platform administrators | New paid order with seller, product and payment details | 1 per active admin |

Therefore, the purchase flow currently creates **up to four seller/buyer SMS
delivery attempts plus one admin SMS per active platform administrator**.

Seller acceptance normally creates one buyer SMS, one seller SMS, and one
admin SMS per active platform administrator. The admin message includes the
seller, order, payment amount, and `Refund: ₹0 (NOT_APPLICABLE)`.

## Cancellation flow

### Seller cancels

The buyer receives an order-cancelled SMS. If the order was paid and a refund
is initiated, the buyer also receives a refund-status SMS. Each active
platform administrator receives one SMS containing the seller, order and
refund amount/status. The current implementation therefore creates **one
buyer SMS normally, or two buyer SMS when a refund notification is emitted,
plus one admin SMS per active platform administrator**.

### Buyer cancels

The seller receives an order-cancelled SMS and the buyer receives a
 cancellation confirmation SMS. Each active platform administrator receives
 one SMS containing the buyer cancellation and refund amount/status. The
 current implementation creates **two seller/buyer SMS delivery attempts plus
 one admin SMS per active platform administrator**.

Shipment, out-for-delivery, delivery, return, and refund webhook events can
create additional SMS messages later in the order lifecycle.

## Enabling real SMS later

Set these deployment environment variables only after provider credentials and
templates have been configured:

```text
NODE_ENV=production
SMS_DELIVERY_ENABLED=true
SMS_PROVIDER=fast2sms
```

Alternatively configure `SMS_PROVIDER=twilio` with the Twilio credentials
required by the deployment. Local `123456` OTP bypass and development OTP
exposure are disabled when `NODE_ENV=production`.
