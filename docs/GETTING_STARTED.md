# Getting Started

Base URL: `https://manager.adonaisoft.com`

This guide explains how to onboard a customer, approve WhatsApp login, and send automated messages.

## Web Installation (Manager Portal)

Use this if you are using the hosted web dashboard.

1. Open a new browser tab.
2. Go to `https://manager.adonaisoft.com`.
3. Login to the manager portal.
4. Open `Connections` from the sidebar.
5. Continue with the onboarding steps below.

No local installation is required for this web flow.

## Local Installation (Self-Hosted)

Use this if you want to run the manager on your own server.

1. Clone the project repository.
2. Install dependencies:

```bash
npm install
```

3. Set environment variable:

```bash
GATEWAY_JWT_SECRET=your_secure_secret
```

4. Start development server:

```bash
npm run dev
```

5. Open `http://localhost:3000` in a new tab.

## 1. Create a New Connection

Endpoint:

`POST https://manager.adonaisoft.com/api/v1/connections/request`

Request body:

```json
{
  "customerId": "adnonaisoft",
  "customerName": "Adnonai Soft",
  "websiteUrl": "https://adnonaisoft.com"
}
```

Response includes:

- `data.connection.id`
- `data.auth.connectionToken` (JWT for API auth)
- `data.auth.qrCodeDataUrl` (QR image to scan)

## 2. Complete QR Login

1. Open the dashboard at `https://manager.adonaisoft.com/connections`.
2. Create the connection using customer ID and name.
3. Share or scan the generated QR code in WhatsApp.
4. Click `Mark QR Approved` (or call activate API below).

Activate API:

`POST https://manager.adonaisoft.com/api/v1/connections/activate`

Header:

`Authorization: Bearer <connectionToken>`

After activation, status becomes `connected`.

## 3. Send Messages

Endpoint:

`POST https://manager.adonaisoft.com/api/v1/messages/send`

Headers:

`Authorization: Bearer <connectionToken>`

JSON example:

```json
{
  "mobileNumber": "+919999999999",
  "message": "Hello from Adnonai gateway"
}
```

Multipart example fields:

- `mobileNumber` (required)
- `message` (required)
- `file` (optional upload)
- `fileUrl` (optional external attachment URL)

If connection is still `pending_qr`, message API returns `403`.

## 4. Check Status and Metrics

- List connection(s): `GET https://manager.adonaisoft.com/api/v1/connections`
- Dashboard overview: `GET https://manager.adonaisoft.com/api/v1/dashboard/overview`

## cURL Quick Commands

Request connection:

```bash
curl -X POST "https://manager.adonaisoft.com/api/v1/connections/request" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"adnonaisoft\",\"customerName\":\"Adnonai Soft\",\"websiteUrl\":\"https://adnonaisoft.com\"}"
```

Activate connection:

```bash
curl -X POST "https://manager.adonaisoft.com/api/v1/connections/activate" \
  -H "Authorization: Bearer <connectionToken>" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Send message:

```bash
curl -X POST "https://manager.adonaisoft.com/api/v1/messages/send" \
  -H "Authorization: Bearer <connectionToken>" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\":\"+919999999999\",\"message\":\"Hello from gateway\"}"
```
