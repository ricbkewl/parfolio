const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
const menuButton = document.getElementById('menuButton');
const closeMenu = document.getElementById('closeMenu');
const dialog = document.getElementById('contentDialog');
const dialogContent = document.getElementById('dialogContent');
const dialogClose = document.getElementById('dialogClose');

function setDrawer(open) {
  drawer.classList.toggle('open', open);
  scrim.classList.toggle('show', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
}

menuButton.addEventListener('click', () => setDrawer(true));
closeMenu.addEventListener('click', () => setDrawer(false));
scrim.addEventListener('click', () => setDrawer(false));

const aboutContent = `
  <h2>About ParFolio</h2>
  <div class="gold-rule"></div>
  <p class="lead"><strong>Your Game. Your Score. Your Story.</strong></p>
  <p>ParFolio was created to make playing golf with friends simpler, smarter and more connected.</p>
  <p>From the first tee to the final putt, ParFolio keeps the things you need during a round close at hand—GPS distances, interactive course maps, shot planning, personal club suggestions, scoring, weather and your group’s live scorecard.</p>
  <h3>Play Together</h3>
  <p>Create a round, invite your playing partners with a Round Code or QR code, and everyone can follow the round from their own phone. Each golfer controls their own score while the group stays connected through the live scorecard and private round chat.</p>
  <h3>Know Your Next Shot</h3>
  <p>ParFolio combines your location, mapped course information and your personal club distances to help you understand what lies ahead and choose the club that fits the shot.</p>
  <h3>Every Round Becomes Part of Your Story</h3>
  <p>Your completed rounds stay in your history, giving you a simple record of the courses you’ve played, the people you’ve played with and how you performed.</p>
  <h3>Built for Golfers</h3>
  <p>Golf technology should help you play—not distract you from playing. ParFolio is designed around a simple idea: give golfers useful information when they need it, make scoring effortless, and keep everything else out of the way.</p>
  <p class="about-signoff">ParFolio · Your Game. Your Score. Your Story.</p>
`;

const guideContent = `
  <h2>App Guide</h2>
  <div class="gold-rule"></div>
  <p class="lead">Get from the first tee to the final score without digging through menus.</p>
  <h3>Start a Round</h3>
  <p>Choose a course, select the number of holes and your playing tee, then create your round. Share the Round Code or QR code with your group.</p>
  <h3>Join a Round</h3>
  <p>Enter the six-character Round Code, open a shared joining link or scan the host’s QR code.</p>
  <h3>Use the Play Map</h3>
  <p>During play, ParFolio shows your live location, mapped route, distance to the next target, yards remaining, weather, wind and Suggested Club guidance.</p>
  <h3>Plan the Next Shot</h3>
  <p>Move the gold aim marker to explore a shot. ParFolio recalculates yards to hit and yards to go while preserving the mapped route on dogleg holes.</p>
  <h3>Enter Scores</h3>
  <p>Use the large minus and plus controls for fast scoring, or tap the score itself for exact entry. Each golfer edits only their own score.</p>
  <h3>Stay Connected</h3>
  <p>Open the live scorecard to see the group round, or use private round chat to communicate with the players who joined that round.</p>
  <h3>My Clubs</h3>
  <p>Add your typical carry distance for each club. ParFolio uses these distances to make Suggested Club guidance more personal.</p>
  <h3>Previous Rounds</h3>
  <p>Return to completed or unfinished rounds, review scorecards and share branded scorecard summaries.</p>
`;

const placeholderContent = {
  courses: ['Courses', 'Search by course name, city, state, ZIP/postal code or country. Mapped-course status and high-quality previews will appear here.'],
  history: ['Previous Rounds', 'Your completed and in-progress rounds will live here, with scorecards, totals and sharing controls.'],
  clubs: ['My Clubs', 'Set your personal carry distances so Suggested Club guidance reflects your actual game.'],
  profile: ['My Account', 'Manage your profile picture, contact information, password and account preferences.'],
  'new-round': ['Start a Round', 'Course selection, playing tee, 9/18-hole setup and round invitations will be added here.'],
  'join-round': ['Join a Round', 'Enter a Round Code, open a joining link or scan a ParFolio QR code.']
};

function showContent(screen) {
  setDrawer(false);
  if (screen === 'home') return;
  if (screen === 'about') dialogContent.innerHTML = aboutContent;
  else if (screen === 'guide') dialogContent.innerHTML = guideContent;
  else {
    const item = placeholderContent[screen] || ['ParFolio', 'This feature is part of the next build stage.'];
    dialogContent.innerHTML = `<h2>${item[0]}</h2><div class="gold-rule"></div><p class="lead">${item[1]}</p><p>The first ParFolio milestone is establishing a clean, isolated product shell before connecting live accounts, rounds, maps and shared course data.</p>`;
  }
  dialog.showModal();
}

document.querySelectorAll('[data-screen]').forEach((button) => {
  button.addEventListener('click', () => showContent(button.dataset.screen));
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const screen = button.dataset.action === 'start' ? 'new-round' : button.dataset.action === 'join' ? 'join-round' : 'history';
    showContent(screen);
  });
});

dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
