# Smart Shopping List

Smart Shopping List is a modern web application that helps people create, manage, and share shopping lists while surfacing smart suggestions based on previous purchases.

## High-level overview (non-technical)

* Create multiple lists for different occasions (Groceries, Drugstore, BBQ Party).
* Add items with quantity, unit, and category, then mark them as bought or pending.
* Get a “Suggested for you” panel that reminds you about frequently purchased items you might be running low on.
* Share a list using a link so friends or family can see what is needed.

## Architecture

* **Frontend:** React + TypeScript with React Router and utility-first Tailwind CSS for a clean, mobile-friendly UI. Axios handles API calls, and Vite provides the dev server/build.
* **Backend:** Node.js + Express REST API with Prisma ORM. JWT secures routes, bcrypt hashes passwords, and nanoid generates share tokens.
* **Database:** PostgreSQL via Prisma. The backend owns migrations and type-safe queries.
* **Communication:** The frontend calls the backend REST endpoints (`/auth`, `/lists`, `/items`, `/suggestions`) over HTTP. Authenticated calls include a `Bearer` token.

## Database schema (Prisma)

```prisma
model User {
  id           String         @id @default(cuid())
  email        String         @unique
  passwordHash String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  lists        ShoppingList[]
  itemStats    ItemStats[]
}

model ShoppingList {
  id         String   @id @default(cuid())
  title      String
  isArchived Boolean  @default(false)
  shareToken String?  @unique
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  userId String
  items  Item[]
}

model Item {
  id           String   @id @default(cuid())
  name         String
  quantity     Float    @default(1)
  unit         String   @default("pcs")
  category     String   @default("other")
  isBought     Boolean  @default(false)
  lastBoughtAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  list   ShoppingList @relation(fields: [listId], references: [id])
  listId String
}

model ItemStats {
  id                String   @id @default(cuid())
  name              String
  timesBought       Int      @default(0)
  avgBuyIntervalDays Float?
  lastBoughtAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  userId String

  @@unique([userId, name])
}
```

Relations:
* A `User` owns many `ShoppingList` records.
* Each `ShoppingList` has many `Item` entries.
* `ItemStats` tracks per-user frequency and recency of purchases (used for suggestions).

## API design

Authentication:
* `POST /auth/register` — Register with email/password. Body: `{ email, password }`. Response: `{ token, user }`.
* `POST /auth/login` — Log in. Body: `{ email, password }`. Response: `{ token, user }`.
* `GET /auth/me` — Get current user. Header: `Authorization: Bearer <token>`.

Lists:
* `GET /lists` — Get lists for the authenticated user.
* `POST /lists` — Create list. Body: `{ title }`.
* `GET /lists/:id` — Get a list (with items) the user owns.
* `PUT /lists/:id` — Update title/archived flags.
* `DELETE /lists/:id` — Delete a list and its items.
* `GET /lists/shared/:shareToken` — Public, read-only view via share link.

Items:
* `POST /lists/:id/items` — Add item to a list.
* `PUT /items/:id` — Update item or toggle `isBought`. When toggled to bought, `lastBoughtAt` updates and stats increment.
* `DELETE /items/:id` — Remove item.

Suggestions:
* `GET /suggestions` — Returns suggested items for the authenticated user. Heuristic: item must be bought at least `frequentThreshold` (default 3) times, and the days since `lastBoughtAt` must exceed `avgBuyIntervalDays` (or `defaultIntervalDays`, default 14).

Example responses:
* `GET /lists` → `[ { id, title, isArchived, shareToken, ... } ]`
* `GET /lists/:id` → `{ id, title, items: [ { id, name, quantity, unit, category, isBought } ] }`
* `GET /suggestions` → `{ suggestions: [ { name, timesBought, lastBoughtAt } ] }`

## Project structure

```
backend/
  prisma/
    schema.prisma
  src/
    config/
      env.ts
      prisma.ts
    middleware/
      auth.ts
    routes/
      auth.ts
      lists.ts
      items.ts
    server.ts
  package.json
  tsconfig.json

frontend/
  src/
    api.ts
    index.css
    main.tsx
    App.tsx
    pages/
      ListsPage.tsx
      ListDetailPage.tsx
  index.html
  package.json
  tailwind.config.cjs
  tsconfig.json
  vite.config.ts
```

## Running locally

Prerequisites: Node.js 18+, pnpm/npm, PostgreSQL.

1) **Backend environment**
```
cd backend
cp .env.example .env   # create your own file using the template below
npm install
npx prisma migrate dev
npm run dev
```

Example `.env` values:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartlist"
JWT_SECRET="super-secret-change-me"
PORT=4000
```

2) **Frontend**
```
cd frontend
npm install
npm run dev
```
Visit http://localhost:5173 and set `VITE_API_URL=http://localhost:4000` in `frontend/.env` if your API runs elsewhere.

## Example backend code pointers

* **Server bootstrap:** `backend/src/server.ts`
* **Auth routes:** `backend/src/routes/auth.ts`
* **List CRUD:** `backend/src/routes/lists.ts`
* **Item CRUD + suggestions:** `backend/src/routes/items.ts`
* **Prisma schema:** `backend/prisma/schema.prisma`

## Example frontend code pointers

* **Routing & auth shell:** `frontend/src/App.tsx`
* **List overview:** `frontend/src/pages/ListsPage.tsx`
* **List detail + suggestions:** `frontend/src/pages/ListDetailPage.tsx`
* **API helper:** `frontend/src/api.ts`

## Assumptions

* Default API port: `4000`. Frontend dev server: `5173`.
* Suggestion thresholds: at least 3 purchases and 14 days since last purchase (unless `avgBuyIntervalDays` is defined).
* Share links are read-only via `shareToken`. Collaborative editing could be added by allowing guest tokens that can create/update items on a shared list while restricting account-level data.
