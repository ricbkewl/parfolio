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
- Google Satellite live hole view with automatic tee-at-6 / green-center-at-12 orientation
- Clear **TEE** and **CENTER** endpoint markers on mapped holes
- Live route yardage, shot planner, aim points and Suggested Club guidance
- Weather, temperature and relative wind information during play
- Map/Satellite switching, hole navigation, helicopter transitions and GPS recentering
- Offline-ready GPS course packages for supported mapped courses

### Courses
- Searchable shared course library with GPS-first ranking
- Course status system: **GPS Ready, Partial GPS, Course Located**
- Filters for location, hole count, favorites, recent courses, offline courses and GPS status
- Sorting by GPS readiness, distance, name or recent play
- Expanding course coverage across the United States and international markets, including Indonesia
- Administrator course editing, corrections and validation workflow

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
- Streamlined grouped side menu with **Current Round, Golf and Settings** sections
- Direct access to Playing Tee, Scorecard, Chat, Invite Players, My Clubs and Round History
- iPhone safe-area / Dynamic Island support and installable Home Screen experience

### ParFolio Golf Feed
- Automatic homepage golf-content feed below the README/About section
- Current swing tips, short-game instruction, course/travel features and equipment trends
- Automatic YouTube golf-tip and short-video discovery using the YouTube Data API
- Relevance filtering to reduce unrelated, betting and low-value trend content
- Feed refreshes automatically twice per day through GitHub Actions

## Security & Data

- ParFolio uses its own isolated Supabase project and private golfer data
- Row Level Security protects course, scoring, chat and account data
- SECURITY DEFINER RPCs use a fixed safe search path
- Course publishing uses validation states so incomplete or quarantined geometry is not treated as GPS Ready

## Deployment

Production is published from `main` with GitHub Pages.

The app uses Google Maps/Satellite for the golfer-facing map experience, with open-map data and fallback providers where appropriate. GitHub Actions handle automated checks and Golf Feed refreshes.

## Contact and Suggestions

Suggestions for improving ParFolio are welcome.

- Email: [ricbkewl@gmail.com](mailto:ricbkewl@gmail.com)
- Text: [607.438.3208](sms:+16074383208)

**Last updated:** September 2, 2026
