# ParFolio Watch Companion Foundation

## Goal

Make Apple Watch a fast in-round ParFolio surface without duplicating ParFolio's map, GPS, scoring, planner, or Supabase logic.

The phone remains the canonical round engine. The watch receives a small round-state payload and sends narrow actions back to the phone.

## Architecture

```
ParFolio round engine
  ├─ scoring / protected sync
  ├─ GPS + planner calculations
  ├─ club suggestions
  ├─ advanced hole stats
  └─ Google Maps renderer (phone only)
            │
            ▼
ParFolioWatchBridge protocol v1
            │
     iPhone native shell
     WatchConnectivity
            │
            ▼
      watchOS companion
```

The watch bridge MUST NOT:
- instantiate Google Maps
- start a second geolocation watcher
- write directly to Supabase score tables
- maintain a second score model
- implement alternate hole-navigation logic

All mutations are delegated to existing ParFolio functions.

## JavaScript bridge

File: `parfolio-watch-bridge-v332.js`

Global API:

```js
ParFolioWatchBridge.getSnapshot()
ParFolioWatchBridge.publish()
ParFolioWatchBridge.perform({ type: 'score_delta', delta: 1 })
ParFolioWatchBridge.perform({ type: 'set_score', score: 4 })
ParFolioWatchBridge.perform({ type: 'set_putts', putts: 2 })
ParFolioWatchBridge.perform({ type: 'next_hole' })
ParFolioWatchBridge.perform({ type: 'previous_hole' })
ParFolioWatchBridge.subscribe(state => {})
```

The bridge also:
- emits `parfolio:watch-state`
- exposes a `BroadcastChannel` named `parfolio-watch-v1` for local testing
- posts state to a native WebKit message handler named `parfolioWatch` when that handler exists

## Protocol v1 state

Representative payload:

```json
{
  "protocol": 1,
  "bridgeVersion": 332,
  "available": true,
  "round": {
    "id": "round-id",
    "courseId": "course-id",
    "courseName": "Sierra Lakes Golf Club",
    "holes": 18,
    "teeSet": "blue"
  },
  "player": {
    "name": "Rick",
    "userId": "supabase-user-id"
  },
  "hole": {
    "number": 7,
    "par": 4,
    "score": 4,
    "roundTotal": 30,
    "toPar": 2,
    "stats": {
      "putts": 2,
      "fairwayHit": true,
      "greenInRegulation": false,
      "chipShots": 1,
      "sandShots": 0,
      "penalties": 0
    }
  },
  "distances": {
    "toPlanner": 163,
    "routeRemaining": 392,
    "front": 374,
    "center": 386,
    "back": 398,
    "mappedHole": 402
  },
  "suggestion": {
    "club": "6 Iron",
    "note": "Saved carry 165 yd · target is 163 yd"
  },
  "gps": {
    "accuracyYards": 7
  }
}
```

Coordinates can be present in the local bridge payload for future native GPS handoff, but the watch UI should normally consume only the yardage/state fields it needs.

## watchOS v1 screens

### Primary yardage
- Hole number
- Par
- Planner / next-shot yardage as the largest value
- Front / Center / Back
- Suggested club
- GPS accuracy warning only when degraded

### Score
- Current hole score
- minus / plus
- Putts
- Finish hole / next hole

### Round
- Total score
- To par
- Hole progress
- Optional quick stats

### Hole
A simplified schematic only. No satellite tile renderer in v1.

## Native implementation direction

Create a separate native Apple project rather than placing Swift/Xcode artifacts into the production PWA repository.

Recommended targets:
- ParFolio iOS companion target
- ParFolio Watch App target
- shared protocol models

The iOS target hosts or connects to the ParFolio authenticated session, receives bridge messages through `WKScriptMessageHandler`, and forwards compact Codable state through `WCSession`.

The watch sends actions such as `score_delta` or `next_hole`; the phone invokes `ParFolioWatchBridge.perform(...)`. This guarantees the existing protected-scoring and pending-sync logic remains authoritative.

## Phase order

1. Bridge protocol and phone-side contract — started in v332.
2. Browser test panel / protocol validation.
3. Native iPhone companion shell.
4. watchOS primary yardage screen.
5. Score + putts + hole navigation.
6. Background/session resilience.
7. Shot tracking shortcuts.
8. Independent-watch GPS evaluation.
9. Green contour/undulation only after a trustworthy elevation-data source exists.

## Stability rule

Any future Watch feature that needs round data must be added to the bridge snapshot or action contract. It must not patch the Google Maps renderer or create independent round-state mutations.
