# Meta Access Verification — Tech Provider Application

> **Use this text** when filling out the "Access Verification" form in the Meta App Dashboard,  
> after Business Verification has been approved and you've requested Advanced Access for `business_management`.
>
> **Where to paste:** Meta App Dashboard → App Settings → Basic → "Access Verification" section → "Start verification".

---

## 1. Company Legal Name
```
SYNC SOLUCOES [complete legal name as in CNPJ]
```

## 2. Business Website
```
https://www.magiczap.io
```

## 3. Application Name
```
magiczap_solutions
```

## 4. App ID
```
1335266151850577
```

---

## 5. Primary Use Case Description (English)

> Paste in the "How will you use the requested permissions?" field.

```
MagicZap is a multi-tenant SaaS platform that provides AI-powered customer 
service automation through WhatsApp Business for small and medium-sized 
service businesses in Brazil — including barbershops, beauty salons, beauty 
clinics, medical clinics, pet shops, aesthetic studios, dental offices, 
and similar appointment-based service providers.

Our customers are independent business owners who sign up directly on 
magiczap.io, create an account, and use the WhatsApp Embedded Signup flow 
to connect their own WhatsApp Business number to our platform. Once 
connected, MagicZap acts as their automated AI receptionist: it replies 
to their customers' WhatsApp messages 24/7, books appointments based on 
each business's working hours and service catalog, sends appointment 
reminders, handles rescheduling and cancellations, and triggers reactivation 
campaigns to inactive customers — all on behalf of, and authorized by, the 
business owner.

We do NOT message end consumers on our own behalf. Every WhatsApp 
interaction is performed strictly within the WhatsApp Business Account 
(WABA) of the authorizing business owner, using their own phone number and 
their own customer base. We are a Technology Provider enabling small 
businesses to use the WhatsApp Business Platform without having to build 
their own integration.

Multi-tenant architecture overview:
- Each business owner has an isolated tenant in our database (Row Level 
  Security enforced).
- Each tenant connects their own WABA + Phone Number ID via Embedded 
  Signup using Meta's official `fb.login()` flow with config_id.
- Each tenant manages their own templates, conversations, and message logs 
  in isolation.
- We never share data, contacts, or messages between tenants.
- Our umbrella app (magiczap_solutions) acts purely as a Tech Provider 
  facilitating the connection — billing for messages can be either Model A 
  (the client pays Meta directly via their attached payment method) or 
  Model B (MagicZap's Extended Credit Line is shared with the client's 
  WABA via `whatsapp_credit_sharing_and_attach`).
```

---

## 6. Specific Permission Justifications

### 6.1 — `whatsapp_business_messaging`

```
Required to send and receive WhatsApp messages on behalf of each business 
owner who has authorized our app via Embedded Signup. This permission is 
the core of our service: our AI receptionist sends automated replies, 
appointment confirmations, reminders (24h and 3h before appointment), 
no-show recovery messages, and reactivation campaigns — all using the 
WhatsApp Business Account of the authorizing business owner, exclusively 
to that owner's existing customers who have initiated contact or are 
already known clients with prior service history.
```

### 6.2 — `whatsapp_business_management`

```
Required to manage WhatsApp Business Account configuration on behalf of 
each business owner: register and verify their phone numbers, retrieve 
phone number IDs after Embedded Signup, subscribe their WABA to our app's 
webhook for incoming messages (`/subscribed_apps`), upload and manage 
message templates (HSM) used for appointment reminders and reactivation 
campaigns, and read WABA metadata such as quality rating and messaging 
limits to display health metrics in our admin dashboard.
```

### 6.3 — `business_management`

```
Required to operate as a Technology Provider serving multiple independent 
businesses. Specifically, MagicZap uses this permission to:

(a) Assign our verified System User to each client's WABA with the MANAGE 
task immediately after Embedded Signup completes 
(`POST /{waba-id}/assigned_users`), so we can programmatically configure 
their messaging integration without requiring manual intervention from 
the business owner.

(b) Optionally attach our Extended Credit Line as the payer for the 
client's WABA (`POST /{credit-line-id}/whatsapp_credit_sharing_and_attach`), 
enabling our managed billing model where MagicZap absorbs the per-message 
cost from Meta and bills the business owner monthly through our own 
subscription system (Stripe). This removes the friction of asking each 
small business owner to set up a payment method directly with Meta — a 
common drop-off point in our onboarding.

(c) Read and verify the business assets and verification status of 
businesses connecting through Embedded Signup, to ensure compliance and 
provide accurate status indicators in the client dashboard.

We do NOT use `business_management` to access businesses or assets that 
have not been explicitly connected to our app through Embedded Signup. 
We do NOT enumerate or store data about businesses that have not 
authorized us.
```

---

## 7. Step-by-Step Reproduction Instructions

> Paste in "How can our team reproduce your use case?" field.

```
TEST CREDENTIALS
================
URL:      https://magiczap.io/auth
Email:    [create a test account: meta-reviewer@magiczap.io]
Password: [create a strong test password]
Plan:     Pro (already activated for testing)

STEPS TO REPRODUCE
==================

1. Open https://magiczap.io and click "Comece grátis" (Get started).

2. Sign in using the test credentials above. You will be redirected to 
   the onboarding flow at /onboarding.

3. Complete steps 1 through 4 (business data, services, working hours, 
   personalization). Sample data is acceptable.

4. On Step 5 ("WhatsApp"), click the green button labeled "Conectar 
   WhatsApp Business" (Connect WhatsApp Business). This opens Meta's 
   official Embedded Signup popup using:
       - App ID:    1335266151850577
       - Config ID: [your Embedded Signup config ID]
       - Flow:      whatsapp_business_app_onboarding

5. Inside the popup, sign in with a Facebook account that owns or can 
   create a WhatsApp Business Account, and follow Meta's standard 
   Embedded Signup flow to register a test phone number.

6. Once the popup closes, our backend (`whatsapp-embedded-signup` Edge 
   Function) automatically:
       - Extracts the WABA ID and Phone Number ID from the granular 
         scopes returned by `/debug_token`.
       - Subscribes the WABA to our webhook 
         (`POST /{waba-id}/subscribed_apps`).
       - Assigns our System User with MANAGE task to the WABA.
       - Optionally attaches our Extended Credit Line as the payer.
       - Exchanges the short-lived token for a long-lived (60-day) token.
       - Saves all credentials securely in our `pet_shop_configs` table 
         (RLS-protected, isolated per user).

7. Return to magiczap.io and continue to Step 6 to complete onboarding 
   and reach the dashboard at /dashboard.

8. To test incoming/outgoing messaging:
       - From any other WhatsApp account, send a message to the test 
         number you just connected.
       - Within 2-10 seconds, our AI receptionist will reply 
         automatically — demonstrating `whatsapp_business_messaging` in 
         use.

9. To test multi-tenancy and `business_management`:
       - Sign out and create a second test account with a different 
         email.
       - Repeat the Embedded Signup flow with a different WhatsApp 
         number.
       - Verify in the dashboard that each tenant only sees their own 
         WABA, conversations, and customers — proving full data 
         isolation.

10. To inspect the underlying API calls:
        - All Meta Graph API requests are logged in our `admin_audit_logs` 
          and Edge Function logs (available on request).
        - Source code for the relevant Edge Functions:
              - whatsapp-embedded-signup (handles OAuth + WABA setup)
              - whatsapp-cloud-webhook (receives incoming messages)
              - whatsapp-ai-handler (sends outgoing messages)

VIDEO WALKTHROUGH (RECOMMENDED)
================================
Record a 2-3 minute Loom video demonstrating steps 4-8 above.
Upload to YouTube as Unlisted and paste the link here.
```

---

## 8. Data Handling & Privacy

> Paste in "How do you store and use user data?" field.

```
DATA STORAGE
============
- All customer data is stored in Supabase (PostgreSQL) hosted in 
  AWS South America (São Paulo, sa-east-1) for LGPD compliance.
- Each business owner's data is isolated via Row Level Security (RLS) 
  policies enforced at the database level.
- WABA access tokens are stored encrypted at rest, accessible only to 
  the owning user_id via RLS.
- Customer media (audio, images sent by end consumers) is stored in a 
  private storage bucket with signed URLs.

DATA RETENTION
==============
- Conversation history: retained while the customer's account is active, 
  deleted within 30 days of account cancellation.
- WhatsApp messages: retained for 90 days for support and audit purposes.
- Personal data deletion requests: handled via 
  https://www.magiczap.io/data-deletion (response within 15 days, per 
  LGPD article 18).

DATA USAGE
==========
- We use customer WhatsApp data EXCLUSIVELY to provide the contracted 
  AI receptionist service to the authorizing business owner.
- We do NOT sell, share, or use data for advertising.
- We do NOT use end-consumer messages to train AI models.
- AI processing uses Google Gemini via Lovable AI Gateway with strict 
  per-request context (no cross-tenant memory).

LEGAL DOCUMENTS
===============
- Privacy Policy: https://www.magiczap.io/privacy-policy
- Terms of Service: https://www.magiczap.io/terms-of-service
- Data Deletion: https://www.magiczap.io/data-deletion
- Data Controller: SYNC SOLUCOES — CNPJ [your CNPJ]
- Contact: contato@magiczap.io
```

---

## 9. Supporting Links

| Resource | URL |
|---|---|
| Production app | https://www.magiczap.io |
| Sign in | https://www.magiczap.io/auth |
| Privacy Policy | https://www.magiczap.io/privacy-policy |
| Terms of Service | https://www.magiczap.io/terms-of-service |
| Data Deletion | https://www.magiczap.io/data-deletion |
| Support email | contato@magiczap.io |
| Support WhatsApp | +55 11 98091-2272 |

---

## 10. Pre-Submission Checklist

Before clicking "Submit" on the Access Verification form, confirm:

- [ ] Business Verification approved (status = "Verified" in Business Manager)
- [ ] App `magiczap_solutions` (ID `1335266151850577`) is claimed by MagicZap Solutions Business
- [ ] App icon 1024x1024 uploaded to "Basic" settings
- [ ] Privacy Policy URL set to `https://www.magiczap.io/privacy-policy`
- [ ] Terms of Service URL set to `https://www.magiczap.io/terms-of-service`
- [ ] Data Deletion URL set to `https://www.magiczap.io/data-deletion`
- [ ] Category set to "Business and Pages" → "Messaging"
- [ ] App Domain set to `magiczap.io`
- [ ] Contact email verified (`contato@magiczap.io`)
- [ ] Data Protection Officer info filled (name, email, address of SYNC SOLUCOES)
- [ ] Test account created with Pro plan active
- [ ] At least one test WhatsApp number successfully connected via Embedded Signup
- [ ] Loom video recorded (2-3 min) and uploaded as Unlisted on YouTube
- [ ] Source repository access prepared in case Meta requests it (private GitHub invite ready)

---

**Expected response time from Meta:** 5 business days for Tech Provider verification, then an additional 7-14 business days for App Review of the requested permissions.

**If rejected:** Read the rejection reason carefully, fix the specific issue mentioned, and resubmit. Most rejections are due to (a) incomplete reproduction steps, (b) test account not working, or (c) unclear use case description. You can resubmit immediately after fixing.
