(() => {
  const COURSE_LIBRARY_URL = 'https://qziemwgcjkohjchxdvnv.supabase.co';
  const COURSE_LIBRARY_KEY = 'sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  const library = window.supabase.createClient(COURSE_LIBRARY_URL, COURSE_LIBRARY_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const style = document.createElement('style');
  style.textContent = `
    .course-search-wrap{display:grid;gap:12px;margin-top:18px}
    .course-search{width:100%;min-height:50px;border:1px solid rgba(12,91,67,.18);border-radius:15px;background:#fff;padding:0 15px;color:#14221d;font-size:16px}
    .course-search-note{margin:0!important;font-size:12px!important;color:#65746e!important}
    .course-results{display:grid;gap:10px;margin-top:8px}
    .course-result{width:100%;text-align:left;border:1px solid rgba(12,91,67,.12);border-radius:16px;background:#fffdf7;padding:14px 15px;color:#14221d;cursor:pointer}
    .course-result:active{transform:scale(.99)}
    .course-result-name{display:block;color:#052d25;font-weight:620;font-size:15px;line-height:1.3}
    .course-result-meta{display:block;margin-top:5px;color:#65746e;font-size:12px;line-height:1.35}
    .course-status{display:inline-flex;margin-top:9px;border-radius:999px;padding:4px 8px;background:#e8f1ed;color:#0c5b43;font-size:10px;font-weight:650;letter-spacing:.02em}
    .course-status[data-status="catalog_only"]{background:#f3f0e7;color:#766848}
    .course-status[data-status="gps_review"]{background:#edf3e1;color:#536c35}
    .course-status[data-status="verified_gps"],.course-status[data-status="published"]{background:#e3f1e9;color:#0a6648}
    .course-empty{padding:18px 4px;color:#65746e;font-size:13px;text-align:center}
    .course-loading{padding:16px 4px;color:#65746e;font-size:13px}
  `;
  document.head.appendChild(style);

  const labels = {
    catalog_only: 'Catalog Only',
    scorecard_ready: 'Scorecard Ready',
    gps_draft: 'GPS Draft',
    gps_review: 'GPS Review',
    verified_gps: 'Verified GPS',
    published: 'Mapped Course ✓'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function openCourses() {
    const drawer = document.getElementById('drawer');
    const scrim = document.getElementById('scrim');
    drawer?.classList.remove('open');
    scrim?.classList.remove('show');
    drawer?.setAttribute('aria-hidden','true');

    const dialog = document.getElementById('contentDialog');
    const content = document.getElementById('dialogContent');
    content.innerHTML = `
      <h2>Courses</h2><div class="gold-rule"></div>
      <p class="lead">Shared Golf Course Library</p>
      <p>Search the same course directory used across the ParFolio golf ecosystem. Course mapping is maintained once and shared where approved.</p>
      <div class="course-search-wrap">
        <input class="course-search" id="courseLibrarySearch" type="search" placeholder="Course, city, state, ZIP or country" autocomplete="off" aria-label="Search golf courses">
        <p class="course-search-note">Showing approved reference data from the shared Golf Course Library.</p>
        <div class="course-results" id="courseLibraryResults"><div class="course-loading">Loading courses…</div></div>
      </div>`;
    if (!dialog.open) dialog.showModal();

    const input = document.getElementById('courseLibrarySearch');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => searchCourses(input.value), 250);
    });
    searchCourses('');
  }

  async function searchCourses(query) {
    const results = document.getElementById('courseLibraryResults');
    if (!results) return;
    results.innerHTML = '<div class="course-loading">Searching…</div>';
    const { data, error } = await library.rpc('shared_course_catalog_search', { p_query: query.trim(), p_limit: 50 });
    if (error) {
      console.error('Shared course search failed', error);
      results.innerHTML = '<div class="course-empty">Unable to reach the shared course library right now. Please try again.</div>';
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      results.innerHTML = '<div class="course-empty">No matching courses found.</div>';
      return;
    }
    results.innerHTML = rows.map(course => {
      const location = [course.city, course.state_code || course.state, course.country].filter(Boolean).join(', ');
      const details = [location, course.holes ? `${course.holes} holes` : null, course.par ? `Par ${course.par}` : null].filter(Boolean).join(' · ');
      const status = course.mapping_status || 'catalog_only';
      return `<button class="course-result" type="button" data-course-id="${esc(course.shared_course_id)}">
        <span class="course-result-name">${esc(course.name)}</span>
        <span class="course-result-meta">${esc(details || 'Course reference')}</span>
        <span class="course-status" data-status="${esc(status)}">${esc(labels[status] || status)}</span>
      </button>`;
    }).join('');
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-screen="courses"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openCourses();
  }, true);
})();
