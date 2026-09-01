# ParFolio

**Your Game. Your Score. Your Story.**

ParFolio is a separate public golf-app beta with a premium emerald green, champagne gold and ivory visual system.

## Current milestone

This repository currently contains the isolated ParFolio design foundation: app shell, navigation, wording, About section and App Guide shell.

## Isolation rule

ParFolio must not use or expose Agape Tumoutou Golfers private users, rounds, chats, tester data, credentials, secrets or storage. ATG may be used only as a functional reference. Shared golf-course information is consumed through the neutral shared course library under controlled, versioned rules.

The live-round screen follows that boundary: course pars and tee/aim/green geometry come from the read-only `shared_course_payload` contract, while authentication, rounds and golfer-owned scores remain in ParFolio's independent Supabase project. The Google Maps key is a browser key restricted by website and API in Google Cloud; no server or unrestricted credentials belong in client files.

## Planned core features

- GPS and live yardage
- Google Maps satellite/map play view
- Course search and mapping
- Protected scoring
- Shared rounds and QR joining
- Live group scorecards
- Private round chat
- My Clubs and Suggested Club guidance
- Profiles and Previous Rounds
- Weather and wind
- Golfer-assisted course correction suggestions

## Brand

- Primary: Emerald green
- Accent: Champagne gold
- Background: Ivory
- Identity: Interlocking PF golf crest
