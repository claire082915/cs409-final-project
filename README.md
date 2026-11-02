# Lendr: CS 409 Final Project

A borrowing tracker so users keep a shared record of who lent what to whom.

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

Item and upload requests need the `X-User-Id` header until auth is built.

| Endpoint            | Method | Action                             |
| ------------------- | ------ | ---------------------------------- |
| `health`            | GET    | Check the server is up             |
| `items`             | POST   | Create an item                     |
| `items?owner=:id`   | GET    | List a user's items, newest first  |
| `items/:id`         | GET    | Get an item                        |
|                     | PATCH  | Update name, description or photos |
|                     | DELETE | Delete an item and its photos      |
| `uploads/signature` | POST   | Sign a photo upload                |

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
