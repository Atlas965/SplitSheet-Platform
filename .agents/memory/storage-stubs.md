---
name: DatabaseStorage Stubs
description: Many methods in DatabaseStorage were originally no-op stubs — know which ones and fix before use
---

## What Was Stubbed
- `createSongAsset`, `getSongAssets`, `getSongAsset`, `updateSongAsset` — were `return {} as any` stubs
- `createOwnershipRecord`, `getCurrentOwnership`, `getOwnershipHistory` — were stubs
- `recordRevenueEvent`, `getRevenueEvents` — were stubs
- `createRevenueEntry`, `getRevenueEntriesByProjectId`, `getRevenueEntriesByReleaseId` — were stubs
- `createPayout`, `getPayoutsByProjectId`, `getPayoutsByContributorId`, `updatePayoutStatus` — were stubs

All above now have real DB implementations (as of this session).

## Still Stubbed (as of this session)
- `updateOwnershipSplit`, `calculatePayouts`, `executePayouts` — still return [] / {} 
- Various negotiation methods

**Why:** The codebase grew incrementally; stubs were left as placeholders. Before writing routes that call any storage method, grep for the implementation first.
