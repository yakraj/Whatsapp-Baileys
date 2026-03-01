# WhatsApp Baileys Gateway Dashboard

Multi-tenant starter gateway built with Next.js 15 App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, PostgreSQL, and Prisma.

Production Manager URL: `https://manager.adonaisoft.com`

## Stack

- Next.js 15 (App Router, `src/` layout)
- Tailwind CSS + shadcn/ui
- Lucide icons
- Zustand state store
- PostgreSQL + Prisma ORM
- React Hook Form + Zod validation
- `next-themes` dark mode support

## Features Implemented

- Responsive sidebar/navbar dashboard shell
- Dark/light/system theme toggle
- Global fetch API client with typed error handling
- **Enhanced Connection Management**:
  - Persistent auth state (survives reboots & network drops)
  - Auto-reconnect logic for transient failures
  - Explicit manual re-link support (clears stale credentials)
  - 10-digit number auto-formatting (+91 default)
- PostgreSQL-backed gateway store for:
  - customer onboarding (`customerId` + `customerName`)
  - server-issued JWT connection tokens
  - QR-code based login approval flow
  - active mobile number display (+91...) and status updates
  - message queue logs with optional attachment metadata
  - dashboard counters (connections, sent today, failures)
- Route-level `loading.tsx` and `error.tsx` for main dashboard routes

## Folder Highlights

- `src/components/ui`: shadcn/ui primitives
- `src/components/shared`: custom dashboard/layout/form components
- `src/lib`: store, API client, validation, auth helpers
- `src/hooks`: custom data hooks
- `src/types`: shared TypeScript interfaces

## Run Locally

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000`.

## Getting Started Docs

See detailed onboarding + API usage here:

- [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)

## API Endpoints

### 1) Request new connection

`POST /api/v1/connections/request`

JSON body:

```json
{
  "customerId": "adnonaisoft",
  "customerName": "Adnonai Soft",
  "websiteUrl": "https://adnonaisoft.com"
}
```

Response includes:

- `connection` object
- generated `auth.connectionToken` (JWT)
- `auth.qrCodeDataUrl` for QR login

### 2) Activate connection (QR approved)

`POST /api/v1/connections/activate`

- Use one of:
  - `Authorization: Bearer <connectionToken>`
  - body: `{ "connectionId": "<uuid>" }`

Only activated (`connected`) tenants can send messages.

### 3) List connections

`GET /api/v1/connections`

- Without auth: returns all connections
- With `Authorization: Bearer <token>`: returns only that connection

### 4) Send message

`POST /api/v1/messages/send`

- Accepts `application/json` or `multipart/form-data`
- Required fields:
  - `mobileNumber`
  - `message`
- Identity:
  - `Authorization: Bearer <token>` OR `connectionId` in body/form
- Optional attachment data:
  - `file` (multipart upload)
  - `fileUrl` (external URL)

### 5) Dashboard overview

`GET /api/v1/dashboard/overview`

Returns overview metrics + connections + recent messages.

### 6) Check socket status

`GET /api/v1/connections/status`

- Use one of:
  - `Authorization: Bearer <connectionToken>`
  - query: `?connectionId=<uuid>`
- Response includes:
  - `socketStatus` (`connected` | `stale` | `disconnected`)
  - `isReachable` boolean
  - `checkedAt` timestamp

### 7) Logout connection

`POST /api/v1/connections/logout`

- Use one of:
  - `Authorization: Bearer <connectionToken>`
  - body: `{ "connectionId": "<uuid>" }`
- Logout marks connection as `stale` and blocks message sending until re-activation.

## Example Flow (`adnonaisoft`)

1. Create connection via `/api/v1/connections/request` with:
   - `customerId: "adnonaisoft"`
   - `customerName: "Adnonai Soft"`
2. Gateway returns JWT + QR code.
3. Customer scans/approves QR.
4. Activate via `/api/v1/connections/activate`.
5. Use returned JWT in `Authorization` for `/api/v1/messages/send`.

## Notes

- Set `DATABASE_URL` in `.env` for PostgreSQL.
- Run migrations after schema changes: `npx prisma migrate dev`.
- Set `GATEWAY_JWT_SECRET` in environment for production token signing.
- Use `npx prisma studio` to inspect connection and message data.
