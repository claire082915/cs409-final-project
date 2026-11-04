# Lendr: CS 409 Final Project

A borrowing tracker so users keep a shared record of who lent what to whom.

## Frontend

The React + Vite frontend lives in `frontend/` and currently uses sample data for its initial screens and interactions.

```bash
cd frontend
npm ci
npm run dev
```

Pushes to `main` that change `frontend/` build and deploy the site to GitHub Pages through `.github/workflows/deploy-pages.yml`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The Vite build uses relative asset paths so it works at the repository's Pages URL.

## Backend

Deployed at: `https://lendr-api.onrender.com/api`

Changes to `backend/` on `main` are auto-deployed.

### Setup

```bash
cd backend
npm i
cp .env.example .env
npm run dev
```

Add `MONGODB_URI`, `CLOUDINARY_URL` and `JWT_SECRET` values in `.env`.

### Endpoints

Item, upload, and loan requests need an `Authorization: Bearer <token>` header.

| Endpoint            | Method | Action                             |
| ------------------- | ------ | ---------------------------------- |
| `health`            | GET    | Check the server is up             |
| `auth/register`     | POST   | Create an account, returns a JWT   |
| `auth/login`        | POST   | Log in, returns a JWT              |
| `items`             | POST   | Create an item                     |
| `items?owner=:id`   | GET    | List a user's items, newest first  |
| `items/:id`         | GET    | Get an item                        |
|                     | PATCH  | Update name, description or photos |
|                     | DELETE | Delete an item and its photos      |
| `uploads/signature` | POST   | Sign a photo upload                |

| Endpoint            | Method | Action                                |
| ------------------- | ------ | ------------------------------------- |
| `loans`             | POST   | Request a loan                        |
| `loans/:id`         | GET    | View a loan                           |
| `loans/:id/approve` | PATCH  | Approve a request (owner)             |
| `loans/:id/return`  | PATCH  | Mark the item returned (borrower)     |
| `loans/:id/confirm` | PATCH  | Confirm the return (owner)            |
| `loans/:id/reject`  | PATCH  | Reject a request (owner)              |
| `loans/:id/cancel`  | PATCH  | Withdraw a request (borrower)         |
| `loans/lent`        | GET    | List loans you lent, newest first     |
| `loans/borrowed`    | GET    | List loans you borrowed, newest first |

### Items

| Field         | Type     | Notes             |
| ------------- | -------- | ----------------- |
| `name`        | string   | Required for POST |
| `description` | string   | Optional          |
| `photos`      | string[] | Cloudinary URLs   |

Item responses also include `available`, which is `false` while the item is on loan.

PATCH replaces the whole `photos` list and deletes any left-out photos from Cloudinary, so always send the full list.

### Loans

Loan responses are shaped `{ message, data }`, with `data` holding the loan.

#### Request a loan

`POST loans` takes `{ itemId, dueDate }`. The caller becomes the borrower, and `dueDate` must be a future date.

#### Fields

| Field      | Type   | Notes                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------- |
| `item`     | id     | The item being borrowed                                                   |
| `owner`    | id     | The item's owner                                                          |
| `borrower` | id     | The user who requested it                                                 |
| `status`   | string | `requested`, `approved`, `returned`, `confirmed`, `rejected`, `cancelled` |
| `dueDate`  | date   | Required                                                                  |
| `rating`   | number | Optional, whole number from 1 to 5                                        |

#### Dashboard

Each loan's `item` is `{ name, description, photos }`, or `null` if the item was deleted. `GET loans/lent` and `GET loans/borrowed` accept an optional `?status=` filter. Without `?status=`, every loan is returned.

| `status`    | Matches                                |
| ----------- | -------------------------------------- |
| `requested` | Waiting for the owner to approve       |
| `active`    | Approved and not yet past `dueDate`    |
| `overdue`   | Approved and past `dueDate`            |
| `returned`  | Returned by the borrower, or confirmed |
| `rejected`  | Rejected by the owner                  |
| `cancelled` | Withdrawn by the borrower              |

#### Status flow

An item counts as on loan while a loan is `approved` or `returned`.

- `requested` → `approved` (owner approves)
- `approved` → `returned` (borrower returns the item)
- `returned` → `confirmed` (owner confirms the return)
- `requested` → `rejected` (owner rejects) or `cancelled` (borrower withdraws)

### Photos

1. Call `POST uploads/signature` to get `cloudName`, `apiKey`, `timestamp`, `folder` and `signature`
2. Upload the file with those values to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload`
3. Save the returned `secure_url` in the item's `photos`

Photos are stored in a folder for each user, and an item only accepts photos from its owner's folder.
