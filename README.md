# Allo Inventory & Reservation System

An end-to-end inventory and order-fulfillment platform built with Next.js and Prisma (SQLite). It implements a high-concurrency reservation system that temporarily holds stock during checkout to prevent race conditions (overselling) while maintaining an accurate view of available inventory.

## Core Features

- **Real-Time Data Model**: Tracks Products, Warehouses, Inventory (Total vs Reserved Units), and Reservations with state machines (PENDING, CONFIRMED, RELEASED).
- **Concurrency-Safe API**: Reservations are created using atomic raw SQL `UPDATE` operations that increment `reservedUnits` only if `(totalUnits - reservedUnits) >= quantity`. This prevents race conditions where two simultaneous requests try to reserve the last available unit.
- **Dynamic Frontend**: Modern UI with real-time stock rendering, dynamic animations (Framer Motion), and a countdown timer for checkout reservations.
- **Reservation Expiry**: Integrated fail-safes for reservations that timeout or fail to confirm.

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   Push the Prisma schema and seed the initial products/warehouses:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

- `GET /api/products` - Lists all products and their available stock per warehouse.
- `GET /api/warehouses` - Lists all warehouses.
- `POST /api/reservations` - Reserves units for a product. Returns `409 Conflict` if there isn't enough stock available.
- `POST /api/reservations/:id/confirm` - Confirms a pending reservation and permanently deducts the stock. Returns `410 Gone` if the reservation has expired.
- `POST /api/reservations/:id/release` - Releases a reservation early and frees up the held stock.

## Approach to Reservation Expiry

Reservations that aren't confirmed before `expiresAt` must be released automatically to return units to available stock. This is handled via a dual-layered approach to ensure strict consistency and performance:

1. **Background Cron Worker (`/api/cron/cleanup`)**
   A dedicated API route scans the database for `PENDING` reservations where `expiresAt < now()`. It safely releases these holds, decrementing `reservedUnits` in `Inventory` and updating the status to `RELEASED`. In a production environment, this endpoint is configured as a **Vercel Cron Job** running every minute.

2. **Just-In-Time (Lazy) Expiry Validation**
   To prevent race conditions between the cron worker and a user attempting to confirm an expired checkout, the confirm endpoint (`POST /api/reservations/:id/confirm`) implements a just-in-time check. If a user attempts to confirm a reservation that has expired, the transaction instantly intercepts it, forces the release of the units, and returns a `410` error—even if the cron job hasn't swept it yet. This guarantees absolute correctness under all concurrency scenarios.
## Idempotency (Bonus)

Idempotency is implemented for the reserve and confirm endpoints to ensure that retried requests do not result in duplicated side effects (e.g., reserving stock twice).

**How it works:**
1. The client sends an `Idempotency-Key` header with their request.
2. The server intercepts the request and checks the database for an `IdempotencyRecord` matching the key.
3. If the record exists and is `COMPLETED`, the server returns the cached `responseBody` and `statusCode` directly, skipping the handler.
4. If the record is `IN_PROGRESS`, the server returns a `409 Conflict` (or `425 Too Early`), indicating the request is already being processed.
5. If the record doesn't exist, the server creates an `IN_PROGRESS` record, executes the handler, and then updates the record to `COMPLETED` with the serialized response before returning it to the client.
