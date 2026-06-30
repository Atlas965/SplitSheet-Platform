---
name: CoPilot & Onboarding
description: Architecture for the SoundLedger Co-Pilot AI assistant and 9-step onboarding walkthrough
---

## CoPilot (SoundLedger Co-Pilot)
- Component: `client/src/components/CoPilot.tsx` — floating button bottom-right
- API: `POST /api/copilot` (authenticated) — streams messages to OpenAI gpt-4o-mini
- System prompt lives in routes.ts; includes full platform overview, workflow, pricing, music rights knowledge
- Max 10 messages sent for context window efficiency; max 400 tokens per response
- Quick prompts shown when conversation is empty (messages.length <= 1)

## Onboarding Walkthrough
- Component: `client/src/components/OnboardingWalkthrough.tsx`
- 9 steps across 4 phases: Welcome (3), Workspace (2), Legal (3), Rights Ledger (1)
- localStorage keys: `sl_onboarding_completed` (boolean), `sl_onboarding_step` (int)
- resetOnboarding() exported for "Restart Walkthrough" in user dropdown menu
- Shows on first login; skippable at any time

## Mounting
- Both components mounted at bottom of OperatorLayout return, wrapped in `<>...</>` Fragment
- OperatorLayout must use Fragment to return multiple root elements (sidebar div + CoPilot + Onboarding)

**Why:** OperatorLayout was the right mount point so Co-Pilot and onboarding appear on ALL authenticated pages without repeating imports.
