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

Add `MONGODB_URI` and `CLOUDINARY_URL` values in `.env`.

### Endpoints

Item, upload, and loan requests need the `X-User-Id` header until auth is built.

| Endpoint            | Method | Action                             |
| ------------------- | ------ | ---------------------------------- |
| `health`            | GET    | Check the server is up             |
| `items`             | POST   | Create an item                     |
| `items?owner=:id`   | GET    | List a user's items, newest first  |
| `items/:id`         | GET    | Get an item                        |
|                     | PATCH  | Update name, description or photos |
|                     | DELETE | Delete an item and its photos      |
| `uploads/signature` | POST   | Sign a photo upload                |

| Endpoint            | Method | Action                             |
| ------------------- | ------ | ---------------------------------- |
| `loans`             | POST   | Request a loan                     |
| `loans/:id`         | GET    | View a loan                        |
| `loans/:id/approve` | PATCH  | Approve a request (owner)          |
| `loans/:id/return`  | PATCH  | Mark the item returned (borrower)  |
| `loans/:id/confirm` | PATCH  | Confirm the return (owner)         |
| `loans/:id/reject`  | PATCH  | Reject a request (owner) - TBD     |
| `loans/:id/cancel`  | PATCH  | Withdraw a request (borrower) - TBD|

### Items

| Field         | Type     | Notes             |
| ------------- | -------- | ----------------- |
| `name`        | string   | Required for POST |
| `description` | string   | Optional          |
| `photos`      | string[] | Cloudinary URLs   |

PATCH replaces the whole `photos` list and deletes any left-out photos from Cloudinary, so always send the full list.

### Photos

1. Call `POST uploads/signature` to get `cloudName`, `apiKey`, `timestamp`, `folder` and `signature`
2. Upload the file with those values to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload`
3. Save the returned `secure_url` in the item's `photos`

Photos are stored in a folder for each user, and an item only accepts photos from its owner's folder.
