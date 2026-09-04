# Clone Repo
1. Set up GitHub SSH
2. Run `git clone git@github.com:ztfes/request-bin.git` in your local

# Our Stack 
- React
- Vite
- TypeScript
- FastAPI (Application Framework)
- SQLAlchemy (ORM)
- Alembic (Migrations)
- PostgreSQL
- MongoDB

# Our Local Installations:

- Python   → 3.14.x
- fastAPI   → 0.141.1
- TypeScript   → 6.0.3
- Postgres   → 18.x
- MongoDB   → 8.0.xx
- React   → 19.2.x
- npm   → 11.19.x

*"Works on my machine"*

# Local Setup

Start to finish, this gets both halves of the app running on a machine that has
never seen the project. Postgres and MongoDB need to be installed and running
first — the versions we use are listed above.

```bash
brew services start postgresql@18
```

```bash
brew services start mongodb-community@8.0
```

## Environment Variables

### Backend — `backend/.env`

There is a template checked in. Copy it and edit if your local Postgres uses
different credentials:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Read by both `models/database.py` and `alembic/env.py`, so migrations and the app always target the same database. Example: `postgresql://user:password@localhost:5432/chum_bucket` |
| `MONGO_URL` | Yes | Mongo connection string. **The database name comes from the URL path** — `db/mongo.py` calls `get_default_database()`, so `mongodb://localhost:27017/chum_bucket` is required over a bare `mongodb://localhost:27017`. |
| `FRONTEND_ORIGINS` | No | Comma-separated CORS allowlist for the browser. Defaults to `http://localhost:5173,http://127.0.0.1:5173`, which is what Vite serves on. |

`backend/.env` is gitignored. Never commit it.

### Frontend — `frontend/.env` (optional)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No | Base URL for the API and WebSocket. Defaults to `http://localhost:8000`. `src/lib/ws.ts` derives the socket URL from it by swapping `http` → `ws`, and ignores the value if it has no scheme. |

## Backend

1. **Create the virtualenv and install dependencies.**

   ```bash
   cd backend && python3.14 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   ```

2. **Create the Postgres database.** The name must match the one in your
   `DATABASE_URL`.

   ```bash
   createdb chum_bucket
   ```

   Mongo needs no setup step — it creates the database and the
   `captured_requests` collection on the first write.

3. **Run the migrations.** From `backend/`, with the venv active:

   ```bash
   alembic upgrade head
   ```

   Confirm it worked with `alembic current` — it should report the newest
   revision in `backend/alembic/versions/`.

4. **Start the server.**

   ```bash
   uvicorn main:app --reload
   ```

   Uvicorn serves the FastAPI app on `http://localhost:8000`. Interactive API
   docs are at `http://localhost:8000/docs`.

## Frontend

1. **Install dependencies.**

   ```bash
   cd frontend && npm install
   ```

2. **Start the dev server.**

   ```bash
   npm run dev
   ```

   Vite serves on `http://localhost:5173`. Leave the backend running in a
   separate terminal — the frontend calls it directly.

## Verify It Works

1. Open `http://localhost:5173` and click **Create Bucket**. You land on
   `/bin/<public_id>`.
2. Copy the bucket URL shown at the top of the inspector.
3. From another terminal, send it a request — include a trailing path segment:

   ```bash
   curl -X POST http://localhost:8000/<public_id>/webhook -H "Content-Type: application/json" -d '{"hello":"world"}'
   ```

4. The request should appear in the inspector immediately, with no refresh. That
   confirms Postgres, Mongo, and the WebSocket are all wired up correctly.

If the request 404s, the `public_id` is wrong or the bucket was created against
a different database.

## Manual Verification With ngrok

Local `curl` proves the capture path, but not that the app handles a request
from a real external sender. Per [260-8](https://linear.app/2608-team4/issue/260-8/alyssazach-request-capture-live-updates-alyssa-and-zach),
verify that once with ngrok — also the easiest way to demo the app.

1. **Expose the backend** (port 8000, not the frontend's 5173):

   ```bash
   ngrok http 8000
   ```

2. **Build the public bucket URL** by swapping the host. Create the bucket in
   the local UI as usual, then replace `http://localhost:8000` with the
   forwarding URL ngrok prints:

   ```
   https://<subdomain>.ngrok-free.app/<public_id>/webhook
   ```

3. **Point a real webhook sender at it** — a GitHub repository webhook or a
   Stripe test event both work.

4. **Watch it land** in the inspector at `http://localhost:5173/bin/<public_id>`,
   live.

Keep the inspector on `localhost` while doing this. Capture is server-to-server,
so it isn't subject to CORS and `FRONTEND_ORIGINS` needs no change. Only serving
the frontend itself through ngrok would require adding that origin.

# Git Workflows

## Creating a New Branch

We branch off of `main`. Ideally, never branch off another feature branch.
If you need someone else's unmerged work, wait for their PR to land and then
re-sync.

### Steps

1. **Move to `main` and make sure it's clean.**

   ```bash
   git checkout main
   git status
   ```

2. **Sync `main` with the remote.**

   ```bash
   git pull --ff-only origin main
   ```

   `--ff-only` is intentional: if this fails, your local `main` has commits on
   it that aren't on the remote, which means something was committed directly
   to `main` by mistake. Stop and sort that out before branching.

3. **Cut the new branch.**

   ```bash
   git checkout -b feature/260-51-add-request-search
   ```

   Follow the [branch naming convention](#git-branch-naming-convention):
   lowercase, kebab-case, one of the approved prefixes
   (`feature/`, `bugfix/`, `refactor/`, `test/`, `chore/`, `documentation/`).

4. **Push and set the upstream on your first push.**

   ```bash
   git push -u origin feature/260-51-add-request-search
   ```

   After this, plain `git push` works for the rest of the branch's life.

5. **Open a PR against `main`** when the work is ready. Fill in the body with a
   concise description of what's in the PR and link the issue it closes.

### Keeping a Long-Lived Branch Current

If `main` moves while your branch is open, rebase rather than merge so history
stays linear:

```bash
git fetch origin
git rebase origin/main
```

Resolve any conflicts, then `git push --force-with-lease`. Use
`--force-with-lease`, never bare `--force` — it refuses to overwrite commits
someone else pushed to your branch.

---

## Resetting Local Databases After a Migration Lands on `main` (ONLY DO THIS IN LOCAL DEVELOPEMENT WITH TEST DATABASES / DATA)

We run two datastores locally:

| Store    | Purpose                              | Managed by                        |
| -------- | ------------------------------------ | --------------------------------- |
| Postgres | Buckets and bucket metadata          | Alembic (`backend/alembic/versions/`) |
| MongoDB  | Captured request payloads            | Schemaless — no migrations        |

Only Postgres has migrations, but the two stores reference each other: Mongo
documents in `captured_requests` are keyed to bucket IDs that live in Postgres.
**Wiping Postgres without wiping Mongo leaves orphaned request documents that
will never render in the inspector.** Reset both together.

### How to Tell a Migration Landed

After pulling `main`, check whether anything new showed up under the versions
directory:

```bash
git log --oneline -5 origin/main -- backend/alembic/versions/
```

Any new file there means you need to run the steps below.

### Standard Path — Apply New Migrations (No Data Loss)

Use this first. It's non-destructive and is the right answer 90% of the time.

1. **Sync `main`.**

   ```bash
   git checkout main && git pull --ff-only origin main
   ```

2. **Refresh dependencies.**

   ```bash
   cd backend && pip install -r requirements.txt
   

## Git Branch Naming Convention
Git branch names should follow these naming conventions:

- Use lowercase alphanumeric characters
- Use kebab-case format
- Use one of the following name prefixes:
  - `feature/`
  - `bugfix/`
  - `refactor/`
  - `test/`
  - `chore/`
  - `documentation/`
- Name should be prefixed with the Linear issue number

Names should ideally be descriptive but concise
Examples of branch names include:

- `feature/260-19-pagination`
- `bugfix/261-29-remove-async-await`
- `refactor/281-10-simplify-models`

## Merging PRs

In the body, enter a concise description of what is contained in the PR.

# Architecture

The full architecture write-up, with diagram, is
**[images/Request Bin Architecture v2 README.html](images/Request%20Bin%20Architecture%20v2%20README.html)** —
open it in a browser.

The short version: one FastAPI process, two entry points.

```mermaid
flowchart LR
  B[Browser<br/>React + Vite] -->|POST /buckets<br/>GET /buckets/:id| BINS[routes/bins.py]
  BINS -->|insert / query| PG[(PostgreSQL<br/>buckets<br/>bucket_requests)]
  B -->|WS /ws/:id| WSR[routes/websocket.py]
  WSR -->|register| CM[connection_manager.py<br/>in-memory, per process]
  EXT[External HTTP client<br/>curl · webhook sender] -->|ANY /:id/:path| CA[routes/catch_all.py]
  CA -->|insert raw| MG[(MongoDB<br/>captured_requests)]
  CA -->|insert summary| PG
  CA -->|broadcast| CM
  CM -.->|push live JSON| B
```

The browser owns the read path and the socket. Any outside caller lands in
`catch_all.py`, which writes to both databases and then fans the capture out
through the connection manager to every socket watching that bucket.

---

## Design Decisions and Trade-offs

Everything here was a deliberate choice with a cost attached. 
The costs are listed honestly:

### Two databases

**Decision:** Every capture is written twice: the full raw request goes to
MongoDB (`captured_requests`) as a schemaless document with headers, query
params, remote address, and the body base64-encoded; a flattened summary row
goes to PostgreSQL (`bucket_requests`) with the columns the UI actually lists.

**Why:** Captured requests are the definition of unstructured input — arbitrary
headers, arbitrary bodies, possibly not even text. Forcing that into a
relational schema means either losing fidelity or filling a table with `NULLABLE`
columns. But the *questions* the app asks are relational: which bucket, in what
order, how many.

**Trade-off:** Two datastores to install, run, migrate, and reset — which is why
[dev.md](dev.md) has a whole database-reset procedure (this is for the local development environments with dummy/test data - this should **never** be used in production). 

Worse, the two writes aren't a single transaction: if the Postgres insert fails after the Mongo insert
succeeds, an orphaned document is left behind. We accepted that because an orphan in a local debugging tool costs nothing, a distributed transaction would have cost.

### No accounts: a token in `localStorage`

**Decision:** A bucket is a `public_id` plus an
`owner_token`. Reads require the token in an `Owner-Token` header. The browser keeps it in `localStorage`.

**Why:** The tool is worthless if using it requires signing up first. Splitting
the identifier in two gets ownership without building auth: the URL you hand out
is not the credential that reads the results.

**Trade-off:** Real costs, all accepted knowingly: clearing browser storage
permanently orphans the bucket, there's no way to open a bucket on a second
device or share it with a teammate, no recovery or rotation exists. For a local tool with minimal scale (at least for now) with no sensitive data, none of these outweighed skipping an entire auth subsystem.

---