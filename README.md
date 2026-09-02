# ParFolio

![Rick Kulon, app creator](rick-kulon-profile.jpg)

A mobile-first golf companion created by Rick Kulon, featuring shared course mapping, live GPS yardages, protected individual scoring, group scorecards and private round chat.

## Quick Start

1. Create a golfer account with your name, email and phone number.
2. Open the verification email and confirm the account before signing in.
3. One golfer creates a round and shares its six-character code or QR.
4. Other golfers join on their own phones.
5. Each golfer enters only their own score.
6. Open **Live Scorecard** to follow the group.

## Current Features

- Protected 9- and 18-hole group scoring
- Personal score entry defaulted to each hole's par
- Live full-group scorecards and previous-match history
- Branded shareable scorecard images with the ParFolio crest and a copyable text summary
- Six-character round codes, share links and QR joining
- In-app QR camera scanner
- Private round chat with unread alerts, photo sharing and a fixed composer
- Front, center and back green GPS yardages
- Compact in-round GPS, club, yardage and weather panel
- Taller active-hole map with a compact icon-free Suggested Club panel
- Translucent previous/next-hole arrows on the middle edges of the live map
- Full-screen active-round map with a dedicated scoring, chat, scorecard and overflow control dock
- Centered course title and a scorecard control attached to personal scoring
- Pinch, double-tap and plus/minus zoom controls on the live hole map
- Default drag-to-aim shot planner with segment-side yards-to-hit and route-aware yards-to-go labels
- Slim floating in-round score and navigation dock that leaves the map visible through the iPhone safe area
- Automatic Aim 1/Aim 2 progression with a calculated mid-hole fallback when no aim point was mapped
- Tee-aware recommendations that stop suggesting Driver after the golfer moves up the hole
- My Clubs completion reminder for signed-in golfers
- Searchable shared-course library with mapped satellite previews
- Deterministic tee-at-6 / green-at-12 vector satellite framing
- Compact center-only yardage display and map-based wind information
- Larger personal scoring and Live Scorecard controls
- Optional Aim 1 and Aim 2 markers for single and double dogleg holes
- Segmented fairway-route arrows, route-distance totals and next-target club guidance
- Live Map/Satellite switching during a round
- iPhone Dynamic Island safe-area spacing
- Current course temperature and condition icon in Suggested Club
- Live temperature, conditions and wind effect for the current green
- Personal club carry profiles with a prominent Suggested Club display
- GPS accuracy and off-course recommendation safeguards
- Shared course maps with course-name and address search
- Administrator-only course mapping and editing
- Street and MapTiler satellite course-mapping controls
- Helicopter transitions that land on the same tee-at-6 / green-at-12 view
- Measured tee-to-center hole distance and course-based relative wind arrows
- Golfer profile-completion reminders
- Personal match-history removal and host-only permanent round deletion
- Secure host controls to end or reopen a round and remove scoreless accidental joins
- Super-admin management of course administrators
- Private Super Admin player directory listing name, email and phone
- Required first name, last name, email and phone during signup
- Email verification instructions and editable golfer profiles
- Uploadable profile-picture icons on Account, Profile and the private Players directory
- Remembered golfer sessions and password recovery
- Active-round recovery from Home and dedicated Round navigation
- Offline score queue with synchronization after reconnecting
- Custom iPhone and Android Home Screen icons
- Cleaner Suggested Club panel with compact top weather and bottom GPS refresh
- Streamlined welcome page with account-only match and course management
- Shorter, higher-contrast App Guide tips and feature summary
- Automatic editable first-name entry when starting a round
- Additional iPhone Home Screen safe-area spacing above the logo

## Contact and Suggestions

Suggestions for improving the app are welcome.

- Email: [ricbkewl@gmail.com](mailto:ricbkewl@gmail.com)
- Text: [607.438.3208](sms:+16074383208)

**Last updated:** September 2, 2026

## Deployment Notes

The production site is published from the repository root on `main` with GitHub Pages at `https://ricbkewl.github.io/parfolio/`.

Apply the SQL files under `supabase/migrations/` in timestamp order when provisioning another Supabase project. Under **Authentication → URL Configuration**, use the production URL above as the Site URL and Redirect URL.

Google Satellite play uses the browser-restricted Google Maps key configured for this origin. The open-map fallback remains available when Google Maps is unavailable. A playable mapped hole requires a tee and center-green marker; existing course data is preserved when administrators add or correct points.

Location access requires HTTPS and user permission. Mapped courses, accounts, scores and chat messages are stored through Supabase security policies. Run each supplied Supabase SQL upgrade only when its corresponding feature has not already been installed.

Profile pictures are resized in the browser to a 512×512 JPEG and stored in the public `golfer-avatars` bucket. Only the signed-in account owner can upload or replace the file, but anyone with its public image URL can view it.
