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

Deployed at: https://lendr-api.onrender.com/api

Changes to `backend/` on `main` are auto-deployed.

### Setup

```bash
cd backend
npm i
cp .env.example .env
npm run dev
```

Add `MONGODB_URI`, `CLOUDINARY_URL` and `FIREBASE_SERVICE_ACCOUNT` (the service account key JSON on one line) values in `.env`.

### Auth

Sign up, log in (email or Google), log out and password reset will happen in the frontend with the Firebase SDK. The backend only verifies Firebase ID tokens and stores each user's profile.

### Endpoints

Every request except `health` needs an `Authorization: Bearer <Firebase ID token>` header. After the first sign-in, call `POST users` to create the profile, other requests return 403 until then.

Every response is shaped `{ message, data }`. On success `message` is `OK` and `data` holds the result. On an error `message` says what went wrong and `data` is `{}`. `DELETE items/:id` returns 204 with no body.

| Endpoint            | Method | Action                             |
| ------------------- | ------ | ---------------------------------- |
| `health`            | GET    | Check the server is up             |
| `items`             | POST   | Create an item                     |
| `items?owner=:id`   | GET    | List a user's items, newest first  |
| `items/:id`         | GET    | Get an item                        |
|                     | PATCH  | Update name, description or photos |
|                     | DELETE | Delete an item and its photos      |
| `uploads/signature` | POST   | Sign a photo upload                |
| `users`             | POST   | Create your profile                |
| `users/:username`   | GET    | View a user's profile              |

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
| `loans/:id/ratings` | POST   | Rate the other user                   |
|                     | GET    | See the rating you gave on a loan     |
| `loans/reminders`   | GET    | List borrowed loans to return soon    |

### Items

| Field         | Type     | Notes             |
| ------------- | -------- | ----------------- |
| `name`        | string   | Required for POST |
| `description` | string   | Optional          |
| `photos`      | string[] | Cloudinary URLs   |

Item responses also include `available`, which is `false` while the item is on loan.

PATCH replaces the whole `photos` list and deletes any left-out photos from Cloudinary, so always send the full list.

### Loans

#### Request a loan

`POST loans` takes `{ itemId, dueDate }`. The caller becomes the borrower, and `dueDate` must be a future date.

#### Fields

| Field         | Type   | Notes                                                                     |
| ------------- | ------ | ------------------------------------------------------------------------- |
| `item`        | id     | The item being borrowed                                                   |
| `owner`       | id     | The item's owner                                                          |
| `borrower`    | id     | The user who requested it                                                 |
| `status`      | string | `requested`, `approved`, `returned`, `confirmed`, `rejected`, `cancelled` |
| `dueDate`     | date   | Required                                                                  |
| `approvedAt`  | date   | Set when the owner approves the request                                   |
| `returnedAt`  | date   | Set when the borrower marks the item returned                             |
| `confirmedAt` | date   | Set when the owner confirms the return                                    |

#### Dashboard

Each loan's `item` is `{ name, description, photos }`, or `null` if the item was deleted. `GET loans/lent` and `GET loans/borrowed` accept an optional `?status=` filter. Without `?status=`, every loan is returned.

| `status`    | Matches                                 |
| ----------- | --------------------------------------- |
| `requested` | Waiting for the owner to approve        |
| `active`    | Approved and not yet past `dueDate`     |
| `overdue`   | Approved and past `dueDate`             |
| `due-soon`  | Approved and due within the next 3 days |
| `returned`  | Returned by the borrower, or confirmed  |
| `rejected`  | Rejected by the owner                   |
| `cancelled` | Withdrawn by the borrower               |

#### Reminders

`GET loans/reminders` returns your borrowed loans that are overdue or due soon, in `data.overdue` and `data.dueSoon`, soonest due first.

#### Status flow

An item counts as on loan while a loan is `approved` or `returned`.

- `requested` → `approved` (owner approves)
- `approved` → `returned` (borrower returns the item)
- `returned` → `confirmed` (owner confirms the return)
- `requested` → `rejected` (owner rejects) or `cancelled` (borrower withdraws)

#### Ratings

`POST loans/:id/ratings` takes `{ score }`, a whole number from 1 to 5. It only works once the loan is `confirmed`, and each person can rate a loan once. The owner rates the borrower and the borrower rates the owner.

`GET loans/:id/ratings` returns only the rating you gave on that loan. You never see the rating the other person gave you. Overall ratings are shown on profiles as an average and a count.

### Profiles

`GET users/:username` returns `{ username, displayName, items, reputation }` in `data`. `items` lists the user's items, newest first, each with `available`. `reputation` is `{ average, count }`, the average `score` and the number of ratings the user has received from other users, or `null` if they haven't been rated yet.

### Photos

1. Call `POST uploads/signature` to get `cloudName`, `apiKey`, `timestamp`, `folder` and `signature`
2. Upload the file with those values to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload`
3. Save the returned `secure_url` in the item's `photos`

Photos are stored in a folder for each user, and an item only accepts photos from its owner's folder.
