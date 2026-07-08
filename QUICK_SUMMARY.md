# Quick Summary — Contact Sync Fix (2026-07-08)

## Problem
Creating contacts from opportunities or clients didn't reflect in UI without manual page reload.

## Root Cause
**Next.js 16 App Router client-side Router Cache** (`staleTimes`). Data WAS persisting in Supabase correctly. The issue was purely client-side navigation caching stale RSC payloads.

## Solution
4 files changed:

| File | Change |
|------|--------|
| `next.config.ts` | Add `experimental: { staleTimes: { dynamic: 0 } }` |
| `/api/opportunities/route.ts` | Return `newContact` in response |
| `src/components/KanbanBoard.tsx` | Add mutable `contactsList` state + callback |
| `src/components/ClientesList.tsx` | State update instead of `router.refresh()` |

## Status
✅ **VERIFIED LIVE** in localhost:3000 via Chrome automation
- Create opportunity with new contact → visible instantly
- Navigate to Clients → new contact in table
- Back to Opportunities → contact name persists

## Deploy Checklist
- [ ] `npm run build` passes
- [ ] Test in staging if available
- [ ] Merge to main
- [ ] Deploy (Vercel auto-picks up `experimental.staleTimes`)

## Key Takeaway
When data "disappears" only on cross-page navigation in Next.js App Router, check `staleTimes` before re-auditing component logic. Confirm real persistence with DB queries first.

---

See `FIXES.md` for detailed explanation and code diffs.
