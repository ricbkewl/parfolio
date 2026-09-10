# ParFolio

![Rick Kulon, app creator](rick-kulon-profile.jpg)

**Your Game. Your Score. Your Story.**

ParFolio is a mobile-first golf companion created by Rick Kulon for live GPS course play, protected scoring, shared rounds, player communication and personal golf improvement.

## Quick Start

1. Create and verify a golfer account.
2. Search for a course and start a round, or join another golfer by code or QR.
3. Each golfer records only their own score.
4. Use the live GPS map, shot planner, club suggestions, scorecard and round chat while playing.
5. Completed rounds remain available in **Round History**.

## Current Features

### Play & GPS
- Google Satellite live hole view with forward-facing 3D course presentation on supported Google Vector maps
- Automatic hole camera alignment using mapped tee-to-green geometry
- Live route yardage, shot planner, aim points and Suggested Club guidance
- Weather, temperature and relative wind information during play
- Map/Satellite switching, hole navigation, helicopter transitions and GPS recentering
- Automatic recovery when Google Vector rendering becomes available after initial map load
- OpenStreetMap fallback when Google Maps is unavailable
- Offline-ready GPS course packages for supported mapped courses

### Courses
- Searchable shared course library with GPS-first ranking
- Course status system: **GPS Ready, Partial GPS, Course Located**
- Filters for location, hole count, favorites, recent courses, offline courses and GPS status
- Sorting by GPS readiness, distance, name or recent play
- Expanding course coverage across the United States and international markets, including Indonesia
- Administrator course editing, corrections and validation workflow
- Systemwide support for tee, aim, front, center and back-green course geometry where available

### Rounds & Players
- Protected 9- and 18-hole scoring
- Live group scorecards and branded shareable scorecard images
- Round codes, QR joining and QR scanner
- Private round chat with photo sharing and unread alerts
- Round History with personal removal and host-only permanent deletion controls
- Host tools for ending/reopening rounds and managing accidental joins

### Golfer Profile
- Golfer profiles with photo, contact information and remembered login
- My Clubs carry-distance profiles used for Suggested Club recommendations
- Profile and club-setup reminders
- Password recovery and verified-email signup

### Navigation & Mobile Experience
- Streamlined grouped side menu with **Current Round, Golf, Social and Settings** sections
- Direct access to Playing Tee, Scorecard, Chat, Invite Players, My Clubs and Round History
- Friends and Messages with unread-message support
- iPhone safe-area / Dynamic Island support and installable Home Screen experience
- PWA cache versioning and stale-cache cleanup for production updates

### ParFolio Golf Feed
- Automatic homepage golf-content feed below the README/About section
- Current swing tips, short-game instruction, course/travel features and equipment trends
- Automatic YouTube golf-tip and short-video discovery using the YouTube Data API
- Relevance filtering to reduce unrelated, betting and low-value trend content
- Feed refreshes automatically twice per day through GitHub Actions

## Coming Soon

### Trace AI

**Trace AI** is ParFolio's developing computer-vision golf analysis workspace. It is currently under active development and is not yet presented as a finished production analysis feature.

Planned Trace AI capabilities include:

- **Club Trace** — follow the golf club and visualize the clubhead path through the swing
- **Ball Trace** — identify the ball after impact and render its observed flight path
- **Ball-at-Address Vision** — locate and stabilize the golf ball independently from Club Trace
- **Impact Vision** — identify the impact event around the confirmed ball position
- **Swing Phase Analysis** — use body landmarks to understand takeaway, top, downswing, impact, release and finish
- **Automatic Ball Lock** — use compact-object motion, temporal consistency and golfer masking to separate the ball from background movement
- **Trajectory Continuation** — continue a smooth visual flight estimate after enough real ball observations have been collected
- **Manual Correction Tools** — Set Clubhead, Set Ball, Set Impact and Set Landing when automatic detection needs assistance
- Independent **Club Trace** and **Ball Trace** controls so golfers can use either feature separately or together
- High-frame-rate video support designed to improve tracking of fast golf swings and ball launch

Trace AI is intended as a visual swing and shot-analysis tool. Estimated ball-flight graphics are not a substitute for radar or launch-monitor measurements of speed, spin, carry or other ballistics.

## Security & Data

- ParFolio uses its own isolated Supabase project and private golfer data
- Row Level Security protects course, scoring, chat and account data
- SECURITY DEFINER RPCs use a fixed safe search path
- Course publishing uses validation states so incomplete or quarantined geometry is not treated as GPS Ready
- ParFolio remains isolated from ATG private accounts, rounds, scores, chat, profiles and credentials

## Deployment

**Vercel is the sole ParFolio production host.** Production is deployed from the GitHub `main` branch to Vercel.

GitHub remains the source-code and version-history repository. The previous GitHub Pages deployment has been retired as a second production host; the GitHub Pages address is redirect-only so old bookmarks can reach the current Vercel production app.

Supabase provides ParFolio's backend database, authentication, storage and realtime services. Google Maps/Satellite provides the primary golfer-facing map experience, with open-map fallback where appropriate. GitHub Actions continue to handle automated checks and Golf Feed refreshes.

## Contact and Suggestions

Suggestions for improving ParFolio are welcome.

- Email: [ricbkewl@gmail.com](mailto:ricbkewl@gmail.com)
- Text: [607.438.3208](sms:+16074383208)

**Last updated:** September 9, 2026
