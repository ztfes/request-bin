# Clone Repo
1. Set up GitHub SSH
2. Run `git clone git@github.com:ztfes/request-bin.git` in your local

# Our Local Installations Used:

- Python   → 3.14.x
- fastAPI   → 0.141.1
- TypeScript   → 6.0.3
- Postgres   → 18.x
- MongoDB   → 8.0.xx
- React   → 19.2.x
- npm   → 11.19.x

These worked for us, you may be able to get away with other versions, this is just what is working on our machines.

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

## Resetting Local Databases After a Migration Lands on `main`

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
