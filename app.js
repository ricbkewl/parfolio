const SUPABASE_URL = 'https://unsysuuhykdmbsasdhzg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lNH7z0PA6wVEztP3Bp4IUQ_xxBa38_f';
const COURSE_LIBRARY_URL = 'https://qziemwgcjkohjchxdvnv.supabase.co';
const COURSE_LIBRARY_KEY = 'sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
const parfolioClients = window.parfolioClients ||= {};
const sb = parfolioClients.app ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
parfolioClients.courseLibrary ||= window.supabase.createClient(COURSE_LIBRARY_URL, COURSE_LIBRARY_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'parfolio-course-library-readonly'
  }
});

const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
const menuButton = document.getElementById('menuButton');
const closeMenu = document.getElementById('closeMenu');
const dialog = document.getElementById('contentDialog');
const dialogContent = document.getElementById('dialogContent');
const dialogClose = document.getElementById('dialogClose');
const profileButton = document.getElementById('profileButton');
const brandHome = document.getElementById('brandHome');

let currentUser = null;
let currentProfile = null;

function setDrawer(open) {
  drawer.classList.toggle('open', open);
  scrim.classList.toggle('show', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function openDialog(html) {
  dialogContent.innerHTML = html;
  if (!dialog.open) dialog.showModal();
}

function message(text, type = 'info') {
  const el = document.querySelector('.form-message');
  if (!el) return;
  el.textContent = text || '';
  el.dataset.type = type;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function initials(profile, user) {
  const a = profile?.first_name?.trim()?.[0] || '';
  const b = profile?.last_name?.trim()?.[0] || '';
  if (a || b) return `${a}${b}`.toUpperCase();
  return (user?.email?.[0] || 'P').toUpperCase();
}

function profileAvatarMarkup(profile = currentProfile, user = currentUser, sizeClass = '') {
  const label = initials(profile, user);
  const url = profile?.avatar_url;
  if (url) return `<span class="avatar ${sizeClass}"><img src="${escapeHtml(url)}" alt="Profile photo"></span>`;
  return `<span class="avatar avatar-fallback ${sizeClass}">${escapeHtml(label)}</span>`;
}

function renderProfileButton() {
  if (currentProfile?.avatar_url) {
    profileButton.innerHTML = `<img src="${escapeHtml(currentProfile.avatar_url)}" alt="My profile">`;
  } else {
    profileButton.textContent = initials(currentProfile, currentUser);
  }
}

async function loadProfile() {
  if (!currentUser) {
    currentProfile = null;
    profileButton.textContent = 'PF';
    profileButton.setAttribute('aria-label', 'Sign in');
    return;
  }

  const { data, error } = await sb.from('profiles')
    .select('id, first_name, last_name, phone, avatar_url, profile_complete')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error) console.warn('Profile load:', error.message);
  currentProfile = data || null;
  renderProfileButton();
  profileButton.setAttribute('aria-label', 'My profile');
}

async function refreshSession() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  await loadProfile();
}

function aboutContent() {
  const founderPhoto = currentProfile?.avatar_url
    ? `<img src="${escapeHtml(currentProfile.avatar_url)}" alt="Rick Kulon, Founder of ParFolio">`
    : `<span>RK</span>`;

  return `
    <h2>About ParFolio</h2><div class="gold-rule"></div>
    <p class="lead"><strong>Your Game. Your Score. Your Story.</strong></p>
    <p>ParFolio was created to make playing golf with friends simpler, smarter and more connected.</p>
    <p>From the first tee to the final putt, ParFolio keeps the things you need during a round close at hand—GPS distances, interactive course maps, shot planning, personal club suggestions, scoring, weather and your group’s live scorecard.</p>
    <h3>Play Together</h3><p>Create a round, invite your playing partners with a Round Code or QR code, and everyone can follow the round from their own phone. Each golfer controls their own score while the group stays connected through the live scorecard and private round chat.</p>
    <h3>Know Your Next Shot</h3><p>ParFolio combines your location, mapped course information and your personal club distances to help you understand what lies ahead and choose the club that fits the shot.</p>
    <h3>Every Round Becomes Part of Your Story</h3><p>Your completed rounds stay in your history, giving you a simple record of the courses you’ve played, the people you’ve played with and how you performed.</p>
    <h3>Built for Golfers</h3><p>Golf technology should help you play—not distract you from playing. ParFolio is designed around a simple idea: give golfers useful information when they need it, make scoring effortless, and keep everything else out of the way.</p>
    <section class="founder-card">
      <div class="founder-photo">${founderPhoto}</div>
      <div>
        <p class="founder-kicker">FOUNDER</p>
        <h3>Rick Kulon</h3>
        <p>I created ParFolio to make golf technology simpler, more useful and more connected—giving golfers the information they need without adding clutter to the game.</p>
      </div>
    </section>
    <p class="about-signoff">ParFolio · Your Game. Your Score. Your Story.</p>`;
}

const guideContent = `
  <h2>App Guide</h2><div class="gold-rule"></div>
  <p class="lead">Get from the first tee to the final score without digging through menus.</p>
  <h3>Start a Round</h3><p>Choose a course, select the number of holes and your playing tee, then create your round. Share the Round Code or QR code with your group.</p>
  <h3>Join a Round</h3><p>Enter the six-character Round Code, open a shared joining link or scan the host’s QR code.</p>
  <h3>Use the Play Map</h3><p>During play, ParFolio shows your live location, mapped route, distance to the next target, yards remaining, weather, wind and Suggested Club guidance.</p>
  <h3>Plan the Next Shot</h3><p>Move the gold aim marker to explore a shot. ParFolio recalculates yards to hit and yards to go while preserving the mapped route on dogleg holes.</p>
  <h3>Enter Scores</h3><p>Use the large minus and plus controls for fast scoring, or tap the score itself for exact entry. Each golfer edits only their own score.</p>
  <h3>My Clubs</h3><p>Add your typical carry distance for each club. ParFolio uses these distances to make Suggested Club guidance more personal.</p>`;

const placeholderContent = {
  courses: ['Courses', 'Search the shared Golf Course Library by course name, city, state, ZIP/postal code or country.'],
  history: ['Previous Rounds', 'Your completed and in-progress rounds will live here, with scorecards, totals and sharing controls.'],
  clubs: ['My Clubs', 'Set your personal carry distances so Suggested Club guidance reflects your actual game.'],
  'new-round': ['Start a Round', 'Course selection, Playing Tee, 9/18-hole setup and round invitations are the next build stage.'],
  'join-round': ['Join a Round', 'Enter a Round Code, open a joining link or scan a ParFolio QR code.']
};

function authContent(mode = 'signin') {
  if (mode === 'signup') {
    return `
      <h2>Create Account</h2><div class="gold-rule"></div>
      <p class="lead">Create your ParFolio golfer profile.</p>
      <form class="auth-form" id="signupForm">
        <div class="field-row"><label>First Name<input name="firstName" autocomplete="given-name" required></label><label>Last Name<input name="lastName" autocomplete="family-name" required></label></div>
        <label>Email<input name="email" type="email" autocomplete="email" required></label>
        <label>Phone<input name="phone" type="tel" autocomplete="tel" required></label>
        <label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="form-primary" type="submit">Create Account</button>
        <p class="form-message" aria-live="polite"></p>
      </form>
      <button class="text-button" data-auth-mode="signin">Already have an account? Sign in</button>`;
  }

  return `
    <h2>Welcome Back</h2><div class="gold-rule"></div>
    <p class="lead">Sign in to your ParFolio account.</p>
    <form class="auth-form" id="signinForm">
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <button class="form-primary" type="submit">Sign In</button>
      <button class="text-button" type="button" id="forgotPassword">Forgot password?</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
    <button class="text-button" data-auth-mode="signup">New to ParFolio? Create an account</button>`;
}

function profileContent() {
  const p = currentProfile || {};
  return `
    <h2>My Profile</h2><div class="gold-rule"></div>
    <p class="lead">${escapeHtml(currentUser?.email || '')}</p>
    <div class="profile-photo-editor">
      ${profileAvatarMarkup(p, currentUser, 'avatar-large')}
      <div>
        <strong>Profile Photo</strong>
        <p>Add a photo for your ParFolio profile.</p>
        <label class="photo-button">Choose Photo<input id="avatarInput" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
      </div>
    </div>
    <form class="auth-form" id="profileForm">
      <div class="field-row"><label>First Name<input name="firstName" value="${escapeHtml(p.first_name || '')}" required></label><label>Last Name<input name="lastName" value="${escapeHtml(p.last_name || '')}" required></label></div>
      <label>Phone<input name="phone" type="tel" value="${escapeHtml(p.phone || '')}" required></label>
      <button class="form-primary" type="submit">Save Profile</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
    <button class="danger-button" id="signOutButton">Sign Out</button>`;
}

function bindAuthUI() {
  document.querySelectorAll('[data-auth-mode]').forEach(btn => btn.addEventListener('click', () => {
    openDialog(authContent(btn.dataset.authMode));
    bindAuthUI();
  }));

  document.getElementById('signupForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    message('Creating your account…');
    const { error } = await sb.auth.signUp({
      email: fd.get('email').trim(),
      password: fd.get('password'),
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: fd.get('firstName').trim(), last_name: fd.get('lastName').trim(), phone: fd.get('phone').trim() }
      }
    });
    if (error) return message(error.message, 'error');
    message('Account created. Check your email and tap the verification link, then return to ParFolio to sign in.', 'success');
    event.currentTarget.querySelector('button[type="submit"]').disabled = true;
  });

  document.getElementById('signinForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    message('Signing in…');
    const { data, error } = await sb.auth.signInWithPassword({ email: fd.get('email').trim(), password: fd.get('password') });
    if (error) return message(error.message, 'error');
    currentUser = data.user;
    await loadProfile();
    dialog.close();
  });

  document.getElementById('forgotPassword')?.addEventListener('click', async () => {
    const email = document.querySelector('#signinForm input[name="email"]')?.value?.trim();
    if (!email) return message('Enter your email first, then tap Forgot password.', 'error');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    message(error ? error.message : 'Password reset email sent.', error ? 'error' : 'success');
  });
}

async function uploadAvatar(file) {
  if (!file || !currentUser) return;
  if (file.size > 5 * 1024 * 1024) return message('Please choose a photo smaller than 5 MB.', 'error');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${currentUser.id}/profile.${ext}`;
  message('Uploading photo…');

  const { error: uploadError } = await sb.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
    cacheControl: '3600'
  });
  if (uploadError) return message(uploadError.message, 'error');

  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error: profileError } = await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);
  if (profileError) return message(profileError.message, 'error');

  await loadProfile();
  openDialog(profileContent());
  bindProfileUI();
  message('Profile photo updated.', 'success');
}

function bindProfileUI() {
  document.getElementById('avatarInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (file) await uploadAvatar(file);
  });

  document.getElementById('profileForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const firstName = fd.get('firstName').trim();
    const lastName = fd.get('lastName').trim();
    const phone = fd.get('phone').trim();
    message('Saving…');
    const { error } = await sb.from('profiles').update({ first_name: firstName, last_name: lastName, phone, profile_complete: Boolean(firstName && lastName && phone) }).eq('id', currentUser.id);
    if (error) return message(error.message, 'error');
    await loadProfile();
    message('Profile saved.', 'success');
  });

  document.getElementById('signOutButton')?.addEventListener('click', async () => {
    await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
    await loadProfile();
    dialog.close();
  });
}

function requireAuth() {
  if (currentUser) return true;
  openDialog(authContent('signin'));
  bindAuthUI();
  return false;
}

function showContent(screen) {
  setDrawer(false);
  if (screen === 'home') { if (dialog.open) dialog.close(); return; }
  if (screen === 'about') return openDialog(aboutContent());
  if (screen === 'guide') return openDialog(guideContent);
  if (screen === 'profile') {
    if (!requireAuth()) return;
    openDialog(profileContent());
    bindProfileUI();
    return;
  }
  if (screen !== 'courses' && !requireAuth()) return;
  const item = placeholderContent[screen] || ['ParFolio', 'This feature is part of the next build stage.'];
  openDialog(`<h2>${item[0]}</h2><div class="gold-rule"></div><p class="lead">${item[1]}</p>`);
}

menuButton.addEventListener('click', () => setDrawer(true));
closeMenu.addEventListener('click', () => setDrawer(false));
scrim.addEventListener('click', () => setDrawer(false));
brandHome.addEventListener('click', () => showContent('home'));
profileButton.addEventListener('click', () => showContent('profile'));

document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => showContent(button.dataset.screen)));
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  const screen = button.dataset.action === 'start' ? 'new-round' : button.dataset.action === 'join' ? 'join-round' : 'history';
  showContent(screen);
}));

dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

sb.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user || null;
  await loadProfile();
});

refreshSession();
