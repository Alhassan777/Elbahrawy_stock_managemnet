# Laptop Stock Management System

A full-stack stock management system for a refurbished laptop store, built with Node.js, Express, React, PostgreSQL, and Prisma.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)

## Quick Start with Docker

1. Copy the environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `JWT_SECRET` — any strong random string

Shopify credentials are optional — the app works without them and will log a message when Shopify sync is skipped.

2. Start the services:

```bash
docker-compose up --build
```

This starts PostgreSQL on port 5432, the API server on port 4000, and the React client on port 3000.

3. Run database migrations and seed data:

```bash
docker-compose exec server npx prisma migrate deploy
docker-compose exec server npm run seed
```

The seed script will print temporary PINs for the admin and cashier accounts to the terminal. **Save these — they are shown only once.**

Example output:
```
=== STAFF CREDENTIALS (save these — shown only once) ===
Admin   → ID: 1, Temporary PIN: 4821
Cashier → ID: 2, Temporary PIN: 7394
=========================================================
```

4. Open the app at [http://localhost:3000](http://localhost:3000)

Log in with the staff ID and temporary PIN from the seed output. You will be prompted to set a new PIN on first login.

## Local Development (without Docker)

### Database

Start a PostgreSQL instance and set `DATABASE_URL` in your `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/laptop_stock
```

### Server

```bash
cd server
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

### Client

```bash
cd client
npm install
REACT_APP_API_URL=http://localhost:4000 npm start
```

## Project Structure

```
/client              → React frontend
/server
  /routes            → units.js, staff.js, transactions.js, webhooks.js
  /middleware        → authenticate.js, requireAdmin.js,
                       requirePinReset.js, rateLimiter.js
  /services          → shopify.js
  /prisma            → schema.prisma, seed.js
docker-compose.yml
.env.example
```

## Roles

- **Admin**: Full access — inventory management, intake, sales reports, staff management, and QR scanning
- **Cashier**: QR scan and sell view only

## Adding Shopify Credentials

When you're ready to sync with Shopify, add these to your `.env`:

```
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_ACCESS_TOKEN=your-access-token
```

Restart the server after adding credentials. New units will be synced to Shopify on creation, and sold units will be archived automatically.

For Shopify webhooks, set up an "Order creation" webhook in your Shopify admin pointing to `https://your-server-url/webhooks/shopify/order-created`.
