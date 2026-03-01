# Getting Started

Base URL: `https://manager.adonaisoft.com`

This guide explains how to onboard a customer, approve WhatsApp login, check socket status, trigger logout, and send automated messages.

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
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
GATEWAY_JWT_SECRET=your_secure_secret
```

4. Run database migration:

```bash
npx prisma migrate dev --name init
```

5. Generate Prisma client:

```bash
npx prisma generate
```

6. Start development server:

```bash
npm run dev
```

7. Open `http://localhost:3000` in a new tab.

Local API base URL: `http://localhost:3000`

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

The dashboard will display the connected mobile number (e.g., `+919876543210`) next to the status.

## 3. Persistent Connection & Reconnection

The gateway automatically manages connection persistence:

- **Auto-Reconnect**: Connects are automatically restored if the server restarts or if there are transient network issues.
- **Session Storage**: WhatsApp credentials are legally stored in the database (`WaAuthState` table).
- **Stale/Logout**:
  - If you **Unlink Device** from your phone, the connection status updates to `stale`.
  - To reconnect a stale session, simply click **Connect** again in the dashboard. This will generate a **fresh QR code** for a new session.
  - **Note**: Requesting a new connection for an existing customer ID will automatically clear old credentials to ensure a clean setup.

## 4. Check Socket Status

Endpoint:

`GET https://manager.adonaisoft.com/api/v1/connections/status`

Use one of:

- `Authorization: Bearer <connectionToken>`
- Query: `?connectionId=<connectionId>`

Response contains:

- `data.socketStatus` (`connected` | `stale` | `disconnected`)
- `data.isReachable` (`true` or `false`)
- `data.mobileNumber` (e.g., `+919876543210` - if `connected`)
- `data.checkedAt` (ISO timestamp)


## 4. Send Messages

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

Multipart example fields (for file upload):

- `mobileNumber` (required): Target phone number (e.g., "+919999999999")
- `message` (required): Caption or text message
- `file` (optional): Upload a file (image, video, audio, document) directly
- `connectionId` (optional): If not using Bearer token

### Sending Media via JSON (Remote URL)

You can also send media by providing a public URL using `application/json`:

```json
{
  "mobileNumber": "+919999999999",
  "message": "Here is an image link",
  "fileUrl": "https://example.com/image.png",
  "fileName": "image.png",
  "fileType": "image/png"
}
```

### Supported Media Types

- **Images**: Automatically sent as image message
- **Videos**: Automatically sent as video message
- **Audio**: Automatically sent as audio message
- **Documents**: Any other file type sent as document
- `file` (optional upload)
- `fileUrl` (optional external attachment URL)

If connection is still `pending_qr`, message API returns `403`.

## 5. Important: Everlasting Connection

**Crucial for Production:**

If you want an **everlasting connection** and consistency even on logout and across different devices, you **MUST save the JWT (connection token)** in your own database.

- The gateway returns a `token` (JWT) when you create a connection request.
- Store this token securely associated with your customer/user.
- Use this token for all subsequent API requests (`Authorization: Bearer <token>`).
- If the gateway restarts or the session is refreshed, this token remains valid for identifying the connection.

## 6. Logout Connection

Endpoint:

`POST https://manager.adonaisoft.com/api/v1/connections/logout`

Use one of:

- `Authorization: Bearer <connectionToken>`
- JSON body: `{ "connectionId": "<connectionId>" }`

Logout marks status as `stale`. You must re-activate before sending messages again.

## 6. Check Metrics

- List connection(s): `GET https://manager.adonaisoft.com/api/v1/connections`
- Dashboard overview: `GET https://manager.adonaisoft.com/api/v1/dashboard/overview`
- Socket status check:
  `GET https://manager.adonaisoft.com/api/v1/connections/status?connectionId=<connectionId>`
- Logout connection:
  `POST https://manager.adonaisoft.com/api/v1/connections/logout`

## Server Reboot Behavior

- Connection and message records persist in PostgreSQL.
- JWT validation continues after reboot if `GATEWAY_JWT_SECRET` remains unchanged.
- The JWT `connectionToken` is also stored in the database (`connectionToken` column) for reference.
- WhatsApp session credentials (Baileys auth state + signal keys) are stored in the `WaAuthState` table.
- On server start, `instrumentation.ts` automatically calls `waManager.restoreAllSessions()`, which reconnects every `connected` session using the stored credentials — **no QR re-scan required**.
- If a session is **unlinked** from the phone (logged out), the connection status updates to `stale` to stop retries. However, credentials remain stored in the database for potential recovery or debugging.
- To **re-link** a device, simply use the **Connect** button again. This will explicitly clear old credentials and generate a fresh QR code for a new session.

## Message Formatting

- 10-digit numbers (e.g., `9876543210`) are automatically prefixed with `+91`.
- International numbers format must start with `+`.

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

Check socket status:

```bash
curl -X GET "https://manager.adonaisoft.com/api/v1/connections/status?connectionId=<connectionId>"
```

Check socket status (Bearer token):

```bash
curl -X GET "https://manager.adonaisoft.com/api/v1/connections/status" \
  -H "Authorization: Bearer <connectionToken>"
```

Logout connection:

```bash
curl -X POST "https://manager.adonaisoft.com/api/v1/connections/logout" \
  -H "Authorization: Bearer <connectionToken>" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Logout connection by ID:

```bash
curl -X POST "https://manager.adonaisoft.com/api/v1/connections/logout" \
  -H "Content-Type: application/json" \
  -d "{\"connectionId\":\"<connectionId>\"}"
```
