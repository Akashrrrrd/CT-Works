# TODO: Add RED670 Active Tap Selection

## Files to edit:

- [x] **`lib/services/project-calculations.ts`** — Read `active_tap` from input instead of hardcoding `'tap2'`
- [x] **`app/api/workspaces/[id]/computations/route.ts`** — Pass `active_tap` from sheet1 into fullAnalysisInput
- [x] **`app/workspaces/[id]/substations/[subId]/bays/[bayId]/page.tsx`** — Add `active_tap` to UI + form state + buildPayload

