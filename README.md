# Lendr: CS 409 Final Project

A borrowing tracker so users keep a shared record of who lent what to whom.

## Frontend

The React + Vite frontend lives in `frontend/` and currently uses sample data for its initial screens and interactions.

```bash
cd frontend
npm ci
npm run dev
```

Pushes to `main` that change `frontend/` build and deploy the site to GitHub Pages through `.github/workflows/deploy-pages.yml`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The site is served from `/cs409-final-project/`, set as `base` in `vite.config.js` and used as the router's basename. The build copies `index.html` to `404.html`, so GitHub Pages serves the app for any page path and a reload or direct link still opens the right page.

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

Add `MONGODB_URI`, `CLOUDINARY_URL`, `FIREBASE_SERVICE_ACCOUNT` (the service account key JSON on one line) and `GEMINI_API_KEY` values in `.env`. `DEMO_EMAIL_DOMAIN` (like `lendr-cs409-demo.com`) also lets the demo accounts sign in next to `illinois.edu`, leave it empty to allow only Illinois accounts. The demo accounts are `demo` and `demo1` through `demo9` at that domain, each keeps the username from its email, and nobody else can take those usernames. Set `VITE_DEMO_EMAIL_DOMAIN` in the frontend `.env` to the same value.

### Auth

Sign up, log in (email or Google), log out and password reset will happen in the frontend with the Firebase SDK. The backend only verifies Firebase ID tokens and stores each user's profile.

For demos, `POST demo/token` returns `{ token }`, a Firebase custom token for one shared account, `demo@` the `DEMO_EMAIL_DOMAIN`, shown as Demo User. The first call creates the account, already verified, and its profile. Sign in with `signInWithCustomToken`. The route only exists while `DEMO_EMAIL_DOMAIN` is set.

### Endpoints

Every request except `health` and `demo/token` needs an `Authorization: Bearer <Firebase ID token>` header. After the first sign-in, call `POST users` to create the profile, other requests return 403 until then.

Every response is `{ message, data }`, with `data` as `{}` on errors. `DELETE items/:id` returns 204 with no body.

| Endpoint               | Method | Action                                                  |
| ---------------------- | ------ | ------------------------------------------------------- |
| `health`               | GET    | Check the server is up                                  |
| `demo/token`           | POST   | Get a sign in token for the demo account                |
| `items`                | POST   | Create an item                                          |
| `items?owner=:id`      | GET    | List a user's items, newest first                       |
| `items/detect`         | POST   | Draft items from a room photo                           |
| `items/detect/discard` | POST   | Delete the photos of unkept drafts                      |
| `items/browse`         | GET    | List other users' items, newest first                   |
| `items/:id`            | GET    | Get an item                                             |
|                        | PATCH  | Update name, description, category, condition or photos |
|                        | DELETE | Delete an item                                          |
| `search?q=:text`       | GET    | Search items and people                                 |
| `uploads/signature`    | POST   | Sign a photo upload                                     |
| `users`                | POST   | Create your profile                                     |
| `users/me`             | GET    | View your own profile                                   |
|                        | PATCH  | Update your profile                                     |
| `users/:username`      | GET    | View a user's profile                                   |

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

| Field         | Type     | Notes                                                          |
| ------------- | -------- | -------------------------------------------------------------- |
| `name`        | string   | Required for POST                                              |
| `description` | string   | Optional                                                       |
| `category`    | string   | One of the categories in `models/item.js`, defaults to `Other` |
| `condition`   | string   | `New`, `Like new`, `Good` or `Fair`, or `null` when not set    |
| `photos`      | string[] | Cloudinary URLs                                                |

Item responses also include `available`, which is `false` while the item is on loan. Changing `condition` fails with 409 while the item is on loan, since the borrower took it as it was.

`GET items/browse` returns `{ items, total }`, other users' items 12 at a time, newest first, leaving out items on loan. Pass `skip` to get the next page, and `total` counts every match. `q` matches the name or description, ignoring case. `category` and `area` filter by category and by the owner's campus area, and can repeat, like `?category=Books&category=Games`. Each item has `owner` as `{ _id, username, displayName, photo, campusArea, reputation }`, with `reputation` like profiles. When the owner turned off `showProfile`, `username`, `displayName` and `photo` are `null`, and the area and reputation still show.

Deleting hides an item but keeps it so past loans still show it. It fails with 409 while the item is on loan, and pending requests become `rejected`.

`POST items/detect` takes `{ photoUrl }`, a photo of a room uploaded to your folder (see [Photos](#photos)). Gemini finds up to 20 items worth lending, most lendable first, and each one is cropped out and uploaded to your folder. It returns drafts as `{ name, description, category, condition, photos }` without saving them, so send the ones the user keeps to `POST items`. It can take a while, so show a loader. It returns 400 if the photo isn't a JPEG, PNG, WebP or AVIF, and 429 once the day's Gemini requests are used up. The room photo is deleted once it has been read, so upload it again to retry.

`POST items/detect/discard` takes `{ photos }`, the photos of the drafts the user didn't keep, and deletes them from Cloudinary. It returns 204, or 409 without deleting anything if one of the photos belongs to an item or your profile.

PATCH replaces the whole `photos` list and deletes any left-out photos from Cloudinary, so always send the full list.

### Loans

#### Request a loan

`POST loans` takes `{ itemId, dueDate, message }`. The caller becomes the borrower, and `dueDate` must be a future date. `message` is an optional note to the owner, up to 300 characters.

#### Fields

| Field         | Type   | Notes                                                                     |
| ------------- | ------ | ------------------------------------------------------------------------- |
| `item`        | id     | The item being borrowed                                                   |
| `owner`       | id     | The item's owner                                                          |
| `borrower`    | id     | The user who requested it                                                 |
| `status`      | string | `requested`, `approved`, `returned`, `confirmed`, `rejected`, `cancelled` |
| `dueDate`     | date   | Required                                                                  |
| `message`     | string | Optional note to the owner, up to 300 characters                          |
| `approvedAt`  | date   | Set when the owner approves the request                                   |
| `returnedAt`  | date   | Set when the borrower marks the item returned                             |
| `confirmedAt` | date   | Set when the owner confirms the return                                    |

#### Dashboard

Each loan's `item` is `{ name, description, category, photos, deletedAt }`. In `GET loans/lent` and `GET loans/borrowed` it also has `available`, so a request can show that its item is out on another loan. `GET loans/lent` also gives each `borrower` a `reputation`, like profiles, so the owner can decide on a request.

`GET loans/lent` and `GET loans/borrowed` accept an optional `?status=` filter. Without `?status=`, every loan is returned.

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

- `requested` → `approved` (owner approves, only before `dueDate`)
- `approved` → `returned` (borrower returns the item)
- `returned` → `confirmed` (owner confirms the return)
- `requested` → `rejected` (owner rejects) or `cancelled` (borrower withdraws)

#### Ratings

`POST loans/:id/ratings` takes `{ score }`, a whole number from 1 to 5. It only works once the loan is `confirmed`, and each person can rate a loan once. The owner rates the borrower and the borrower rates the owner.

`GET loans/:id/ratings` returns only the rating you gave on that loan. You never see the rating the other person gave you. Overall ratings are shown on profiles as an average and a count.

### Profiles

`POST users` takes `{ username, displayName }`. A username is 3 to 20 characters, using only letters, digits, dots or underscores, and is stored lowercase.

`PATCH users/me` takes `{ username, displayName, campusArea, photo, preferences }`, all optional. `campusArea` is one of the areas listed in `models/user.js`, or `""` for none, and anything else returns 400. `photo` is a Cloudinary URL from your own folder (see [Photos](#photos)), or `""` to remove it, and the old photo is deleted from Cloudinary. Email comes from Firebase and can't be changed here.

`preferences` holds the Settings toggles as booleans: `borrowRequests`, `dueDateReminders` and `showProfile`, all defaulting to `true`. Send only the ones you want to change.

With `showProfile` off, other users can't see your profile or find you in search, and your items show without your name, username or photo. Loans still show both people's names, since the owner approves each request.

`GET users/:username` returns `{ username, displayName, photo, campusArea, joinedAt, lentCount, borrowedCount, items, reputation }`, or 404 when the user turned off `showProfile` and isn't you. `joinedAt` is when the account was created. `lentCount` and `borrowedCount` count the user's loans that came back, as owner and as borrower. `items` lists the user's items, newest first, each with `available`. `reputation` is `{ average, count }`, the average `score` and the number of ratings the user has received from other users, or `null` if they haven't been rated yet.

### Search

`GET search?q=camera` returns `{ items, people, itemTotal, peopleTotal }`, up to 5 of each plus the number of matches in each, matching `q` anywhere in the text and ignoring case. `limit` asks for more, from 1 to 50, for a full results page. `items` are other users' items whose name matches, newest first, each with `available` and `owner` like `items/browse`. `people` are other users whose username or display name matches, as `{ username, displayName, photo, campusArea, reputation }`, leaving out anyone with `showProfile` off. A missing or blank `q` returns 400, and a `limit` outside 1 to 50 returns 400.

Pass `skip` to get the next page of results, and `type=items` or `type=people` to fetch only one section.

A `q` starting with `@` only looks up usernames that start with the rest, so `@may` finds `maya_chen` and returns no items.

### Photos

1. Call `POST uploads/signature` to get `cloudName`, `apiKey`, `timestamp`, `folder` and `signature`
2. Upload the file with those values to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload`
3. Save the returned `secure_url` in the item's `photos`

Photos are stored in a folder for each user, and an item only accepts photos from its owner's folder.
