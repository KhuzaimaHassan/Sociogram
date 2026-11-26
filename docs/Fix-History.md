# Fix history

This file records reviewed Sociogram repairs and what was verified for each release. It distinguishes deployed behavior from local tests and notes checks that were intentionally skipped.

## Merged repairs

| Release | Change | Verification and limits |
| --- | --- | --- |
| [PR #1](https://github.com/KhuzaimaHassan/Sociogram/pull/1), merged 2026-11-07 as ed8708b | Restored post creation; fixed multipart upload handling and retryable drafts; routed shared Reels to the Reel viewer; bundled and integrity-checked face-expression models; added graceful manual-reaction fallback and camera cleanup; added Vercel SPA route rewrites. The approved preview origin was added to the existing Render CORS allowlist without replacing existing origins. | Frontend regression tests, production build, CI, Vercel deployment, API health, CORS preflights, authenticated preview, model asset hashes, and production feed/profile/create/reload flows passed. Synthetic local media was used. No physical camera or public post was used for acceptance. |
| [PR #2](https://github.com/KhuzaimaHassan/Sociogram/pull/2), merge commit c0cadf0 | Added persistent account-scoped saved posts, saved indicators and Profile → Saved posts; enforced private-post visibility; added removal/retry/pagination states, stale-account guards, stable owner-scoped cursors, and cascading bookmark cleanup. | Isolated PostgreSQL and browser checks covered account separation, reload persistence, removal, private visibility, media playback, and responsive layouts. Post-merge production browser checks verified save, reload, collection display, removal, and restoration of the original empty state. Large-collection pagination and production offline-retry behavior were not browser-tested. |
| [PR #3](https://github.com/KhuzaimaHassan/Sociogram/pull/3), merged 2026-11-13 as 61c2d07 | Corrected Stories API paths and response handling; added retryable list failures, stale-request/account guards, refresh after creation/viewing, and safe deletion/viewer behavior. | Frontend and backend regressions, build, and authenticated local UI flows passed. The production follow-up later verified the normal Stories list and creator open/close. Production story creation, viewing, and deletion were not used for acceptance. |
| [PR #4](https://github.com/KhuzaimaHassan/Sociogram/pull/4), merged 2026-11-13; resulting main 2ca776c | Preserved sessions during temporary API/network failures; kept protected content hidden until identity recovery; added a retry screen on the current route; retained actual 401 sign-out behavior; guarded refresh and bootstrap against malformed, stale, or concurrent responses. | Combined test suite (61 tests), production build, deployment, and production reload/navigation checks passed. Outage/retry fault injection was local against an isolated API; no production outage or credential mutation was performed. |

## Verification boundaries and follow-up

- Camera expression accuracy and physical-device behavior have not been verified; camera use was skipped during acceptance.
- End-to-end realtime message delivery was not established by these releases.
- Render free-tier sleep remains possible. Session recovery makes temporary API unavailability recoverable; it does not keep the service awake.
- The /stories 404 noted during the 2026-11-10 saved-posts audit predates PR #3. The later PR #4 production check reported the normal empty Stories list and creator open/close. Treat the earlier 404 as superseded evidence, not an unresolved production finding.
- The separate Sociogram README presentation draft is not part of these code releases.

For detailed screenshots, test output, deployment evidence, and individual release limits, see the linked pull requests and the review records maintained with the project work.
