(() => {
  const client = window.supabase.createClient(
    'https://unsysuuhykdmbsasdhzg.supabase.co',
    'sb_publishable_lNH7z0PA6wVEztP3Bp4IUQ_xxBa38_f'
  );

  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let clubs = [];

  const style = document.createElement('style');
  style.textContent = `
    .clubs-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0 10px}
    .club-add,.club-seed,.club-save,.club-delete{border:0;cursor:pointer;border-radius:12px;min-height:40px;padding:0 13px;font-size:12px;font-weight:600}
    .club-add,.club-save{background:#073e31;color:#fff}.club-seed{background:#e8f1ed;color:#073e31}.club-delete{background:transparent;color:#963d34;padding:0 7px}
    .clubs-list{display:grid;gap:10px;margin-top:12px}.club-row{display:grid;grid-template-columns:minmax(0,1fr) 96px auto;gap:8px;align-items:end;padding:12px;border:1px solid rgba(12,91,67,.12);border-radius:16px;background:#fffdf7}
    .club-row label{display:grid;gap:5px;color:#65746e;font-size:10px;font-weight:650;letter-spacing:.03em}.club-row input{width:100%;min-height:42px;border:1px solid rgba(12,91,67,.17);border-radius:11px;background:#fff;padding:0 11px;color:#14221d;font-size:15px}.club-actions{display:flex;align-items:center;gap:2px}.clubs-message{min-height:20px;margin:10px 0 0!important;font-size:12px!important}.clubs-message.error{color:#9b3128!important}.clubs-message.success{color:#0c5b43!important}.clubs-empty{padding:18px 4px;color:#65746e;font-size:13px;text-align:center;border:1px dashed rgba(12,91,67,.18);border-radius:15px}
    @media(max-width:520px){.club-row{grid-template-columns:1fr 92px}.club-actions{grid-column:1/-1;justify-content:flex-end}.club-save{min-width:88px}}
  `;
  document.head.appendChild(style);

  function setMsg(text, kind='') {
    const el = document.getElementById('clubsMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = `clubs-message ${kind}`;
  }

  async function getUser() {
    const { data: { session } } = await client.auth.getSession();
    return session?.user || null;
  }

  async function openClubs() {
    const user = await getUser();
    if (!user) {
      document.querySelector('[data-screen="profile"]')?.click();
      return;
    }
    document.getElementById('drawer')?.classList.remove('open');
    document.getElementById('scrim')?.classList.remove('show');
    const dialog = document.getElementById('contentDialog');
    const content = document.getElementById('dialogContent');
    content.innerHTML = `
      <h2>My Clubs</h2><div class="gold-rule"></div>
      <p class="lead">Your personal carry distances</p>
      <p>Enter the distance you normally carry each club. ParFolio will use these numbers for Suggested Club guidance during play.</p>
      <div class="clubs-toolbar"><button class="club-add" id="addClubButton">+ Add Club</button><button class="club-seed" id="standardSetButton">Add Standard Set</button></div>
      <div class="clubs-list" id="clubsList"><div class="clubs-empty">Loading your clubs…</div></div>
      <p class="clubs-message" id="clubsMessage" aria-live="polite"></p>`;
    if (!dialog.open) dialog.showModal();
    document.getElementById('addClubButton').addEventListener('click', addClub);
    document.getElementById('standardSetButton').addEventListener('click', addStandardSet);
    await loadClubs();
  }

  async function loadClubs() {
    const user = await getUser();
    if (!user) return;
    const { data, error } = await client.from('clubs').select('id,club_name,carry_yards,sort_order,is_active').eq('user_id', user.id).eq('is_active', true).order('sort_order').order('club_name');
    if (error) return setMsg(error.message, 'error');
    clubs = data || [];
    renderClubs();
  }

  function renderClubs() {
    const list = document.getElementById('clubsList');
    if (!list) return;
    if (!clubs.length) {
      list.innerHTML = '<div class="clubs-empty">No clubs added yet. Tap <strong>Add Standard Set</strong> for a quick start, or add clubs one at a time.</div>';
      return;
    }
    list.innerHTML = clubs.map(c => `
      <div class="club-row" data-club-id="${esc(c.id)}">
        <label>CLUB<input class="club-name" value="${esc(c.club_name)}" maxlength="40" aria-label="Club name"></label>
        <label>CARRY YDS<input class="club-carry" type="number" min="1" max="400" inputmode="numeric" value="${c.carry_yards ?? ''}" placeholder="—" aria-label="Carry yards"></label>
        <div class="club-actions"><button class="club-save" data-save-club="${esc(c.id)}">Save</button><button class="club-delete" data-delete-club="${esc(c.id)}" aria-label="Delete ${esc(c.club_name)}">Delete</button></div>
      </div>`).join('');

    list.querySelectorAll('[data-save-club]').forEach(btn => btn.addEventListener('click', () => saveClub(btn.dataset.saveClub)));
    list.querySelectorAll('[data-delete-club]').forEach(btn => btn.addEventListener('click', () => deleteClub(btn.dataset.deleteClub)));
  }

  async function addClub() {
    const user = await getUser();
    if (!user) return;
    const sort = clubs.length ? Math.max(...clubs.map(c => c.sort_order || 0)) + 10 : 10;
    const { error } = await client.from('clubs').insert({ user_id:user.id, club_name:'New Club', carry_yards:null, sort_order:sort });
    if (error) return setMsg(error.message, 'error');
    await loadClubs();
    setMsg('Club added. Enter its name and carry distance.', 'success');
  }

  async function addStandardSet() {
    const user = await getUser();
    if (!user) return;
    if (clubs.length && !confirm('Add the standard clubs to your existing list?')) return;
    const names = ['Driver','3 Wood','5 Wood','4 Hybrid','5 Iron','6 Iron','7 Iron','8 Iron','9 Iron','Pitching Wedge','Gap Wedge','Sand Wedge','Lob Wedge','Putter'];
    const existing = new Set(clubs.map(c => c.club_name.toLowerCase()));
    const rows = names.filter(n => !existing.has(n.toLowerCase())).map((club_name, i) => ({ user_id:user.id, club_name, carry_yards:null, sort_order:(i+1)*10 }));
    if (!rows.length) return setMsg('Your standard set is already listed.', 'success');
    setMsg('Adding clubs…');
    const { error } = await client.from('clubs').insert(rows);
    if (error) return setMsg(error.message, 'error');
    await loadClubs();
    setMsg('Standard set added. Enter your normal carry distances and tap Save on each club.', 'success');
  }

  async function saveClub(id) {
    const user = await getUser();
    const row = document.querySelector(`.club-row[data-club-id="${CSS.escape(id)}"]`);
    if (!user || !row) return;
    const name = row.querySelector('.club-name').value.trim();
    const raw = row.querySelector('.club-carry').value.trim();
    const carry = raw ? Number(raw) : null;
    if (!name) return setMsg('Enter a club name.', 'error');
    if (carry !== null && (!Number.isInteger(carry) || carry < 1 || carry > 400)) return setMsg('Carry distance must be between 1 and 400 yards.', 'error');
    const { error } = await client.from('clubs').update({ club_name:name, carry_yards:carry }).eq('id', id).eq('user_id', user.id);
    if (error) return setMsg(error.message, 'error');
    await loadClubs();
    setMsg(`${name} saved.`, 'success');
  }

  async function deleteClub(id) {
    const user = await getUser();
    if (!user) return;
    const club = clubs.find(c => c.id === id);
    if (!confirm(`Remove ${club?.club_name || 'this club'}?`)) return;
    const { error } = await client.from('clubs').delete().eq('id', id).eq('user_id', user.id);
    if (error) return setMsg(error.message, 'error');
    await loadClubs();
    setMsg('Club removed.', 'success');
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-screen="clubs"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openClubs();
  }, true);
})();