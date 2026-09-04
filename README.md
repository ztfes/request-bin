# Welcome to ChummBucket! 👋

A self-hosted request bin. Create a **bucket**, get a public URL, point any
webhook or `curl` at it, and watch the requests land in your browser in real
time (headers, body, and all)!

---

## The Team

- **Alyssa Easter** — [@alyssa43](https://github.com/alyssa43)
- **Zach Fester** — [@ztfes](https://github.com/ztfes)
- **Jack Sebben** — [@jackouni](https://github.com/jackouni)
- **Vy Vu** — [@vyvu73](https://github.com/vyvu73)

We worked over Discord (chat and video), pair-programmed with VSCode LiveShare, tracked issues in Linear, and reviewed every change as a pull request on GitHub. Architecture was agreed on as a team *before* any feature code was written, and every PR was reviewed by a human regardless of how it was authored.

---

## What It Does

Debugging a webhook usually means guessing at what the sender actually
transmitted. ChummBucket removes the guessing: it gives you a URL that
accepts anything and shows you exactly what arrived.

- **Create a bucket** — one click, no account. You get a `public_id` (the URL
  anyone can send to) and a private `owner_token` (the secret that lets *you*
  read it back).
- **Receive anything** — any common method, any path under your bucket, any body,
  from any origin. Nothing is rejected or validated.
- **Watch it live** — the inspector holds an open WebSocket, so captured
  requests appear the instant they arrive, with no refresh and no polling.
- **Inspect the detail** — method, path, timestamp, full header map, and body
  for every request, kept in order.

There are two visual themes — a straight **professional theme** and the **"ChummBucket" theme** *(toggled from the header)*.

---

## Using the Application

Setup (dependencies, databases, migrations) lives in **[dev.md](dev.md)**. Once
you're set up, you need both processes running.

### 1. Start the backend

```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload
```

Serves on `http://localhost:8000`. Interactive API docs are at
`http://localhost:8000/docs`.

### 2. Start the frontend

```bash
cd frontend && npm run dev
```

Serves on `http://localhost:5173`. Open that in a browser.

### 3. Create a bucket

Click **Create Bucket** on the landing page. The app calls `POST /buckets`,
stores the returned `owner_token` in `localStorage`, and routes you to
`/bin/:publicId` — the inspector for that bucket.

Copy the bucket URL from the top of the inspector.

### 4. Send it a request

Add any path you like on the end - the bucket accepts every path beneath it.

```bash
curl -X POST http://localhost:8000/<public_id>/webhook -H "Content-Type: application/json" -d '{"hello":"world"}'
```

Point a real webhook provider at the same URL and it works identically.

### 5. Watch it arrive

The request appears in the inspector immediately - no refresh. Click any entry
to expand its headers and body. The connection indicator shows whether the live
socket is open.

### Ownership, in one paragraph

There are no accounts. The `owner_token` returned at creation is the only key to
a bucket's contents, and it lives in that browser's `localStorage`. **Clear your
browser storage and the bucket is unreadable forever** — the URL still captures
requests, but nothing can read them back. Opening the same bucket in a different
browser shows nothing, by design.

---

## Contributing

Branch naming, PR workflow, local setup, and the database-reset procedure are
all in **[dev.md](dev.md)**.

> "A problem well stated is a problem half solved." — Charles Kettering