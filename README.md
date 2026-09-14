# ParFolio

![Rick Kulon, app creator](rick-kulon-profile.jpg)

**Your Game. Your Score. Your Story.**

ParFolio is a mobile-first golf companion created by Rick Kulon for live GPS course play, protected scoring, shared rounds, shot tracking, player communication and personal golf improvement.

## Quick Start

1. Create and verify a golfer account.
2. Search for a course and start a round, or join another golfer by code or QR.
3. Each golfer records only their own score.
4. Use the live GPS map, planner, club suggestions, Shot Tracking, scorecard and round chat while playing.
5. Review completed rounds, courses, records and progress from **My Page**.

## Current Features

### Play & GPS
- Stable Google Maps/Satellite hole view with tee-to-green forward orientation where supported
- Live route yardage, shot planner, aim points and Suggested Club guidance
- Weather, temperature, wind, GPS recentering and hole navigation
- Compact glass **Shot Tracking** control: mark the ball, measure live GPS distance and save the landing point
- Saved shots can include club, hole, distance and GPS accuracy and sync to the golfer's ParFolio account
- Offline-ready GPS course packages for supported mapped courses

### Courses
- Searchable shared course library with GPS-first ranking
- Course status system: **GPS Ready, Partial GPS, Course Located, Quarantined**
- Recent Searches shown alongside Nearby & Recommended courses
- Filters and sorting for GPS readiness, distance, holes, favorites, offline status and recent play
- Growing U.S. and international coverage, including expanded Tennessee coverage and Indonesia
- Administrator editing, corrections, validation and safe publishing workflow

### Rounds & Players
- Protected 9- and 18-hole scoring
- Live group scorecards and branded shareable scorecard images
- Round codes, QR joining and QR scanner
- Private round chat with photo sharing and unread alerts
- Round History with removal/deletion controls and host round-management tools

### My Page & Golfer Profile
- Premium **My Page** player dashboard with profile, career overview and recent rounds
- Tracks rounds played, unique courses, repeat course visits, scoring average, best score and scoring trend
- Career highlights including **Longest Drive**, **Hole in One**, best round and total rounds
- Fairway, GIR and putting averages when advanced scoring data is available
- Friends access plus course history and personal records
- My Clubs carry-distance profiles for Suggested Club recommendations, including expanded hybrid options
- Profile photo, password recovery, verified-email signup and remembered login

### Navigation & Mobile Experience
- Streamlined grouped menu with **Current Round, Golf, Social and My Page** access
- Compact glass-style floating controls designed to preserve map and scoring visibility
- Friends and Messages with unread-message support
- iPhone safe-area / Dynamic Island support and installable Home Screen experience
- PWA cache versioning, startup recovery and stale-cache cleanup

### ParFolio Golf Feed
- Automatic homepage golf-content feed
- Swing tips, short-game instruction, course/travel features and equipment trends
- YouTube golf-tip discovery with relevance filtering
- Automatic refresh through GitHub Actions

## Coming Soon

### Trace AI

**Trace AI** is ParFolio's developing computer-vision golf analysis workspace and is not yet presented as a finished production analysis feature.

Planned capabilities include **Club Trace, Ball Trace, Ball-at-Address Vision, Impact Vision, Swing Phase Analysis, Automatic Ball Lock, Trajectory Continuation, manual correction tools** and independent Club/Ball Trace controls with high-frame-rate video support.

Trace AI is intended as a visual swing and shot-analysis tool. Estimated flight graphics are not a substitute for radar or launch-monitor measurements.

## Security & Data

- ParFolio uses its own isolated Supabase project and private golfer data
- Row Level Security protects account, scoring, chat and golfer-shot data
- Course publishing uses validation states so incomplete or quarantined geometry is not treated as GPS Ready
- ParFolio remains isolated from ATG private accounts, rounds, scores, chat, profiles and credentials

## Deployment

**Vercel is the sole ParFolio production host.** Production deploys from the GitHub `main` branch.

GitHub remains the source-code and version-history repository. Supabase provides authentication, database, storage and realtime services. Google Maps/Satellite provides the primary golfer-facing map experience. GitHub Actions handle automated checks and Golf Feed refreshes.

**v271 remains the known-good map baseline for rollback/reference.** Newer feature layers are designed to preserve that stable Google-only round-map behavior.

## Contact and Suggestions

Suggestions for improving ParFolio are welcome.

- Email: [ricbkewl@gmail.com](mailto:ricbkewl@gmail.com)
- Text: [607.438.3208](sms:+16074383208)

**Last updated:** September 14, 2026
