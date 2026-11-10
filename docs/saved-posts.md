# Saved posts

Bookmarks are stored per authenticated account rather than in browser memory.
Use the bookmark button in the feed, then **Profile → Saved posts** to view or
remove items. Reloading or signing back in retrieves the account's saved state.
The collection is not exposed on another user's profile.

## API

All routes require the existing Bearer-token authentication:

| Route | Behavior |
| --- | --- |
| `POST /api/posts/:id/save` | Idempotently save an accessible post |
| `DELETE /api/posts/:id/save` | Idempotently remove this account's bookmark |
| `GET /api/posts/saved?limit=20&cursor=...` | List this account's visible saved posts, newest first |

The saved-post page supports 1–50 results per request. Its opaque cursor carries
the owner's ID and the last bookmark's timestamp/ID, so deleting that bookmark
does not break the next page. The cursor is pagination data, not an authorization
token: every query is still restricted to `req.user.id`. Private-account content
is hidden if the user no longer follows its author. Feed, explore and post-detail
responses expose only a `saved` boolean, not another account's bookmark records.

## Database and deployment

Both Prisma schemas define `Bookmark`, with a unique account/post pair, an index
for the saved-list order, and cascading cleanup when a user or post is deleted.
The SQLite baseline also gains `User.isPrivate`, which these visibility checks
require. The PostgreSQL schema already had that field.

The production schema change is additive: one `bookmarks` table, two indexes and
two foreign keys. The existing Render build applies it with `prisma db push` when
the backend change is approved for deployment. This change removes the build's
`--accept-data-loss` flag; unexpected destructive schema drift stops deployment
instead of being accepted automatically. Do not point QA commands at production.

Frontend-only Vercel previews cannot validate the new endpoints against an older
API. Use a matching local/staging backend until the backend/schema is deployed.
The local review environment uses a separate PostgreSQL database and ports.

## Automated checks

Use an empty, disposable PostgreSQL database on loopback whose name ends in
`_qa`. From `sociogram-backend`, set `DATABASE_URL` and `TEST_DATABASE_URL` to that
same database, generate the production client, apply the schema, then run tests:

```sh
npx prisma generate --schema=prisma/schema.prod.prisma
npx prisma db push --schema=prisma/schema.prod.prisma
npm test
```

The integration suite refuses non-loopback URLs or database names without the
`_qa` suffix. It uses uniquely named fixtures and removes only those fixtures.
It tests authentication, account isolation, concurrent/idempotent operations,
private-post access, stable pagination and foreign-key cleanup. The GitHub
workflow provisions its own ephemeral PostgreSQL service.

From `sociogram-frontend`, `npm test` covers saved-state hydration, failure
rollback, retries, pagination and account changes alongside the existing post and
expression lifecycle regressions. `npm run build` also verifies model assets.

Browser checks must separately cover save → reload → sign out/in → saved list,
removal, the header message link, and phone/tablet/desktop layouts. Automated
component tests alone do not certify the responsive UI or a physical device.
