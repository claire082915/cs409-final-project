# Lendr: CS 409 Final Project

Lendr lets UIUC students borrow things from each other on campus. Owners list what they're willing to lend, and borrowers request it with a return date.

Available at https://claire082915.github.io/cs409-final-project/. Click **Try the demo** on the login page to try it without a NetID.

## Features

- **Auto-populate:** take a photo of a room, and Gemini drafts a listing with a cropped photo for up to 20 items it finds.
- **Trusted borrowers:** owners can auto-approve requests from trusted borrowers, who have 3+ returns, 90% on time, and are rated 4+ by lenders.
- **Return photos:** the borrower takes a photo when returning an item, and the owner compares it to the listing photo and condition before confirming.
- **Due dates and reminders:** every loan has a return date, borrowers get a reminder 3 days before, and overdue loans show on the dashboard.
- **Ratings:** owner and borrower rate each other after a return, and ratings show on profiles.

## Stack

- **Frontend:** React and Vite, hosted on GitHub Pages
- **Backend:** Express and MongoDB, hosted on Render
- **Auth:** Firebase
- **Photo uploads:** Cloudinary
- **Auto-populate:** Gemini 4 Hydrogen (with Gemini 3.8 Flash and 3.6 Flash as fallbacks)

## Running locally

Create `backend/.env` and `frontend/.env` from their `.env.example` files, then run `npm i` and `npm run dev` in each. The app opens at http://localhost:5173/cs409-final-project/.

## API

Routes and request details are in [docs/api.md](docs/api.md).
