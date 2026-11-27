# API

Base URL: `https://lendr-api.onrender.com/api` (open [health](https://lendr-api.onrender.com/api/health) to check if it's up)

Every request except `health` and `demo/token` needs an `Authorization: Bearer <Firebase ID token>` header for an `@illinois.edu` account, or a verified demo account. A missing or bad token returns 401. `POST users` creates the profile, and other requests return 403 until then, or while the email isn't verified.

`POST demo/token` returns a Firebase custom token for the shared Demo User account, creating it on the first call.

Every response is `{ message, data }`, with `data` as `{}` on errors. Routes with nothing to return, like `DELETE items/:id`, respond 204 with no body.

## Endpoints

| Endpoint               | Method | Action                                   |
| ---------------------- | ------ | ---------------------------------------- |
| `health`               | GET    | Check if the server is up                |
| `demo/token`           | POST   | Get a sign in token for the demo account |
| `items`                | POST   | Create an item                           |
| `items?owner=:id`      | GET    | List a user's items, newest first        |
| `items/detect`         | POST   | Draft items from a room photo            |
| `items/detect/discard` | POST   | Delete photos of discarded drafts        |
| `items/browse`         | GET    | List other users' items, newest first    |
| `items/:id`            | GET    | Get an item                              |
|                        | PATCH  | Update an item                           |
|                        | DELETE | Delete an item                           |
| `search?q=:text`       | GET    | Search items and people                  |
| `uploads/signature`    | POST   | Sign a photo upload                      |
| `users`                | POST   | Create your profile                      |
| `users/me`             | GET    | View your own profile                    |
|                        | PATCH  | Update your profile                      |
| `users/:username`      | GET    | View a user's profile                    |

| Endpoint                | Method | Action                                                        |
| ----------------------- | ------ | ------------------------------------------------------------- |
| `loans`                 | POST   | Request a loan                                                |
| `loans/:id`             | GET    | View a loan                                                   |
| `loans/:id/approve`     | PATCH  | Approve a request (owner)                                     |
| `loans/:id/return`      | PATCH  | Mark the item returned (borrower)                             |
| `loans/:id/confirm`     | PATCH  | Confirm the return (owner)                                    |
| `loans/:id/reject`      | PATCH  | Reject a request (owner)                                      |
| `loans/:id/cancel`      | PATCH  | Withdraw a request (borrower)                                 |
| `loans/lent`            | GET    | List loans you lent, newest first                             |
| `loans/borrowed`        | GET    | List loans you borrowed, newest first                         |
| `loans/:id/ratings`     | POST   | Rate the other user                                           |
|                         | GET    | See the rating you gave on a loan                             |
| `loans/reminders`       | GET    | List your borrowed loans that are overdue or due soon         |
| `loans/auto-approvable` | GET    | Count pending requests auto-approve would approve immediately |
| `loans/pending`         | GET    | Count requests and loans waiting on you                       |

| Endpoint             | Method | Action                           |
| -------------------- | ------ | -------------------------------- |
| `notifications`      | GET    | List your notifications          |
|                      | DELETE | Dismiss all your notifications   |
| `notifications/read` | PATCH  | Mark all your notifications read |
| `notifications/:id`  | DELETE | Dismiss a notification           |

## Items

| Field         | Type     | Notes                                                          |
| ------------- | -------- | -------------------------------------------------------------- |
| `name`        | string   | Required for POST                                              |
| `description` | string   | Optional                                                       |
| `category`    | string   | One of the categories in `models/item.js`, defaults to `Other` |
| `condition`   | string   | `New`, `Like new`, `Good` or `Fair`, or `null` when not set    |
| `photos`      | string[] | Cloudinary URLs, at least one, and PATCH can't empty them      |

Responses add `available`, which is `false` while the item is on loan. While it's on loan, changing `condition` or deleting the item returns 409. Deleting hides the item and rejects its pending requests. PATCH replaces the whole `photos` list.

`GET items/browse` returns `{ items, total }`, 12 at a time, with `skip` for the next page. It filters by `q` (name or description) and by repeatable `category` and `area`, and leaves out items on loan.

### Auto-populate

`POST items/detect` takes `{ photoUrl, attempt, taskId }` and returns up to 20 unsaved drafts. `attempt` (0 to 3) picks the Gemini model, and on a 429 or 503 you retry with the next one. `POST items/detect/discard` takes `{ photos }` and deletes the drafts' photos, or returns 409 if one is in use.

## Loans

`POST loans` takes `{ itemId, dueDate, message }`, and comes back `approved` if auto-approve applies. `PATCH loans/:id/return` takes `{ photo }`, the borrower's return photo.

`requested` → `approved` → `returned` → `confirmed`, or `requested` → `rejected` or `cancelled`. The item is on loan while `approved` or `returned`.

### Fields

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
| `returnPhoto` | string | The borrower's photo of the item at return                                |
| `confirmedAt` | date   | Set when the owner confirms the return                                    |

`GET loans/lent` and `GET loans/borrowed` take an optional `?status=`:

| `status`    | Matches                                 |
| ----------- | --------------------------------------- |
| `requested` | Waiting for the owner to approve        |
| `active`    | Approved and not yet past `dueDate`     |
| `overdue`   | Approved and past `dueDate`             |
| `due-soon`  | Approved and due within the next 3 days |
| `returned`  | Returned by the borrower, or confirmed  |
| `rejected`  | Rejected by the owner                   |
| `cancelled` | Withdrawn by the borrower               |

`GET loans/lent` also gives each borrower a `reputation` and `trust`. `GET loans/pending` returns the counts `{ requests, loans }`, and `GET loans/reminders` returns `{ overdue, dueSoon }`.

`POST loans/:id/ratings` takes `{ score }` from 1 to 5, once per person after the loan is `confirmed`. `GET` returns only the rating you gave.

### Auto-approve

A borrower is `trusted` with 3+ confirmed returns, 90% on time, and a 4+ average from lenders, `standard` otherwise, or `new` with no returns. Auto-approve approves a trusted borrower's request when the item is free, and turning it on approves the ones already waiting. Owners turn it on with the `autoApprove` preference, and `GET loans/auto-approvable` counts the waiting requests it would approve.

## Notifications

`GET notifications` returns your 20 newest notifications. It also adds a due soon reminder for loans you borrowed that are due within 3 days (unless `dueDateReminders` is off).

## Profiles

`POST users` takes `{ username, displayName }`, with a username of 3 to 20 characters (letters, digits, dots or underscores). `PATCH users/me` takes any of `{ username, displayName, campusArea, photo, preferences }`.

`preferences` are booleans: `showProfile`, `borrowRequests`, `requestUpdates`, `returnUpdates` and `dueDateReminders` default to `true`, and `autoApprove` to `false`. With `showProfile` off, others can't find you in search or open your profile.

`GET users/:username` returns the profile with `items`, `reputation` (`{ average, count }` or `null`) and `trust`, or 404 if it's hidden.

## Search

`GET search?q=` returns `{ items, people, itemTotal, peopleTotal }`, 5 of each by default. `limit` (1 to 50), `skip` and `type=items` or `type=people` page through one section. A `q` starting with `@` only matches usernames.

## Photos

`POST uploads/signature` returns `{ cloudName, apiKey, timestamp, folder, signature }` for a signed Cloudinary upload into your own folder. The API only accepts photos from the right user's folder.
