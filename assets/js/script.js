/* assets/js/script.js
   Integrated client-side script for Canterbury–Westland site.

   Changes here:
   - Removed dynamic insertion of dropdowns.
   - Adds enhancement for existing HTML submenus: aria attributes, hidden state,
     mobile tap to toggle, keyboard handling, click-outside to close, Escape handling.
   - All other functionality (theme toggle, nav toggle, renderers, hydration, lightbox)
     remains as before.
*/

/* eslint-disable no-console */

// ========== Theme toggle & persistence ==========
const root = document.documentElement;
const storedTheme = localStorage.getItem('theme');
if (storedTheme) root.setAttribute('data-theme', storedTheme);

// small export for other modules/pages
export const formatNZDate = (isoDate, time) => {
  try {
    const dt = new Date(`${isoDate}${time ? 'T' + time : ''}`);
    return dt.toLocaleString('en-NZ', { dateStyle: 'long', timeStyle: time ? 'short' : undefined });
  } catch { return isoDate; }
};

// ========== Utilities ==========
async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
  return res.json();
}

function safeHTML(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function normalizeHref(h) {
  if (!h) return h;
  h = String(h).trim();
  if (/^#/i.test(h)) return h;
  if (/^(?:https?:|mailto:|tel:|\/\/)/i.test(h)) return h;
  if (h.startsWith('/')) return h;
  return '/' + h.replace(/^\/+/, '');
}

function normalizePathForCompare(h) {
  if (!h) return '';
  try {
    const url = new URL(h, location.href);
    let path = url.pathname || '/';
    if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
    if (path.endsWith('/index.html')) path = path.slice(0, -'/index.html'.length) || '/';
    return path;
  } catch (err) {
    let s = String(h).split('?')[0].split('#')[0];
    if (!s.startsWith('/')) s = '/' + s;
    if (s !== '/' && s.endsWith('/')) s = s.slice(0, -1);
    if (s.endsWith('/index.html')) s = s.slice(0, -'/index.html'.length) || '/';
    return s;
  }
}

const CURRENT_PATH_NORM = normalizePathForCompare(location.href);

// ========== Header & nav interactions (enhance existing submenus) ==========
document.addEventListener('click', (e) => {
  const toggler = e.target.closest('.theme-toggle');
  const navToggle = e.target.closest('.nav-toggle');

  if (toggler) {
    const current = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', current);
    localStorage.setItem('theme', current);
  }

  if (navToggle) {
    const nav = document.getElementById(navToggle.getAttribute('aria-controls'));
    if (!nav) return;
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    if (open) nav.querySelector('a, button')?.focus();
  }
});

/**
 * enhanceExistingSubmenus()
 * - Look for .has-submenu elements with existing .submenu children.
 * - Do not insert new markup — instead add aria, hidden states, keyboard and click handlers.
 */
function enhanceExistingSubmenus() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const topUL = nav.querySelector('.container > ul');
  if (!topUL) return;

  // initialize each .has-submenu
  const submenuItems = Array.from(nav.querySelectorAll('.has-submenu'));
  submenuItems.forEach(li => {
    const trigger = li.querySelector(':scope > a');
    const submenu = li.querySelector(':scope > .submenu');

    // if there's no submenu in HTML, skip — (preserve existing behavior)
    if (!trigger || !submenu) return;

    // ensure submenu is hidden initially (JS-controlled)
    submenu.hidden = true;
    submenu.setAttribute('role', submenu.getAttribute('role') || 'menu');
    submenu.querySelectorAll('a').forEach(s => {
      s.setAttribute('role', s.getAttribute('role') || 'menuitem');
      s.tabIndex = -1;
    });

    // aria on trigger; keep trigger as <a> so CSS pseudo-element for arrow remains
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');

    // Keyboard support on trigger
    trigger.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        // open submenu
        const isOpen = li.classList.contains('open');
        li.classList.toggle('open', !isOpen);
        submenu.hidden = isOpen; // toggled
        trigger.setAttribute('aria-expanded', String(!isOpen));
        submenu.querySelectorAll('a').forEach(a => a.tabIndex = !isOpen ? 0 : -1);
        if (!isOpen) submenu.querySelector('a')?.focus();
      } else if (ev.key === 'Escape') {
        li.classList.remove('open');
        submenu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        submenu.querySelectorAll('a').forEach(a => a.tabIndex = -1);
        trigger.focus();
      }
    });

    // Click / tap: only intercept on narrow screens (mobile behavior)
    trigger.addEventListener('click', (ev) => {
      if (window.innerWidth <= 860) {
        // prevent following link on mobile — instead toggle
        ev.preventDefault();
        const isOpen = li.classList.toggle('open');
        submenu.hidden = !isOpen;
        trigger.setAttribute('aria-expanded', String(isOpen));
        submenu.querySelectorAll('a').forEach(a => a.tabIndex = isOpen ? 0 : -1);
      } else {
        // On desktop, let link follow if it points to real page.
        // If link is "#" then prevent default and toggle instead.
        const href = (trigger.getAttribute('href') || '').trim();
        if (href === '#' || href === '') {
          ev.preventDefault();
          const isOpen = li.classList.toggle('open');
          submenu.hidden = !isOpen;
          trigger.setAttribute('aria-expanded', String(isOpen));
          submenu.querySelectorAll('a').forEach(a => a.tabIndex = isOpen ? 0 : -1);
        }
      }
    });
  });

  // Close open submenus when clicking/tapping outside
  document.addEventListener('click', (ev) => {
    submenuItems.forEach(li => {
      if (!li.classList.contains('open')) return;
      if (!li.contains(ev.target)) {
        li.classList.remove('open');
        const trigger = li.querySelector(':scope > a');
        const submenu = li.querySelector(':scope > .submenu');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (submenu) {
          submenu.hidden = true;
          submenu.querySelectorAll('a').forEach(a => a.tabIndex = -1);
        }
      }
    });
  });

  // Close on Escape globally
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      submenuItems.forEach(li => {
        if (li.classList.contains('open')) {
          li.classList.remove('open');
          const trigger = li.querySelector(':scope > a');
          const submenu = li.querySelector(':scope > .submenu');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
          if (submenu) {
            submenu.hidden = true;
            submenu.querySelectorAll('a').forEach(a => a.tabIndex = -1);
          }
        }
      });
    }
  });
}

// ========== Year in footer ==========
for (const el of document.querySelectorAll('[data-year]')) {
  el.textContent = new Date().getFullYear();
}

// ========== Renderers (data-driven) ==========
function renderEvents(list, limit) {
  const sorted = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = sorted.filter(e => new Date(e.date) >= new Date(Date.now() - 86400000));
  const items = (upcoming.length ? upcoming : sorted).slice(0, limit || sorted.length);
  return items.map(e => `
    <article class="card" id="${safeHTML(e.id || '')}">
      <h3>${safeHTML(e.title)}</h3>
      <p class="meta">${safeHTML(formatNZDate(e.date, e.time))} · ${safeHTML(e.location)}</p>
      <p>${safeHTML(e.description)}</p>
      <div class="chips"><span class="chip">${safeHTML(e.category)}</span></div>
      ${e.link ? `<p><a class="btn" href="${safeHTML(normalizeHref(e.link))}">Learn more</a></p>` : ''}
    </article>`).join('');
}

function renderAnnouncements(list, limit) {
  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted.slice(0, limit || sorted.length).map(a => `
    <article class="card" id="${safeHTML(a.id || '')}">
      <h3>${safeHTML(a.title)}</h3>
      <p class="meta">${safeHTML(formatNZDate(a.date))}</p>
      <p>${safeHTML(a.summary)}</p>
      ${a.link ? `<p><a class="btn" href="${safeHTML(normalizeHref(a.link))}">Read more</a></p>` : ''}
    </article>`).join('');
}

function renderProjects(list, limit) {
  return list.slice(0, limit || list.length).map(p => `
    <article class="card" id="${safeHTML(p.id || '')}">
      <img src="${safeHTML((p.images && p.images[0]) || '/assets/images/placeholder-1200x800.jpg')}" alt="${safeHTML(p.title)}" loading="lazy" width="1200" height="800" />
      <h3>${safeHTML(p.title)}</h3>
      <p class="meta">${safeHTML(p.student || '')} · ${safeHTML(p.grade || '')}</p>
      <p>${safeHTML(p.summary || '')}</p>
      <div class="chips">${(p.category || []).map(c => `<span class="chip">${safeHTML(c)}</span>`).join('')}</div>
      ${p.detailsLink ? `<p><a class="btn" href="${safeHTML(normalizeHref(p.detailsLink))}">View details</a></p>` : ''}
    </article>`).join('');
}

function renderMembers(list) {
  return list.map(m => `
    <article class="card" style="text-align:center">
      <img src="${safeHTML(m.photo || '/assets/images/headshot-placeholder.jpg')}" alt="${safeHTML(m.name)}" width="400" height="400" loading="lazy" style="border-radius:999px; margin-inline:auto; width:160px; height:160px; object-fit:cover" />
      <h3>${safeHTML(m.name)}</h3>
      <p class="meta">${safeHTML(m.role)}</p>
      <p>${safeHTML(m.bio || '')}</p>
      ${m.email ? `<p><a class="btn" href="mailto:${safeHTML(m.email)}">Email</a></p>` : ''}
    </article>`).join('');
}

function renderResources(list) {
  const rows = list.map(r => `
    <tr>
      <td><a href="${safeHTML(normalizeHref(r.url || '#'))}" ${r.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>${safeHTML(r.title)}</a></td>
      <td>${safeHTML(r.type || '')}</td>
      <td>${safeHTML(r.size || '')}</td>
    </tr>`).join('');
  return `<div class="card"><div class="table-wrap"><table class="table" aria-describedby="resources-desc"><thead><tr><th>Title</th><th>Type</th><th>Size</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderPrizes(list, limit) {
  return list.slice(0, limit || list.length).map(p => `
    <article class="card" id="${safeHTML(p.id || '')}">
      <h3>${safeHTML(p.title)}</h3>
      ${p.sponsor ? `<p class="meta">Sponsored by ${safeHTML(p.sponsor)}</p>` : ''}
      <p>${safeHTML(p.description || '')}</p>
      ${p.category ? `<div class="chips"><span class="chip">${safeHTML(p.category)}</span></div>` : ''}
    </article>`).join('');
}

function renderWinners(list, limit) {
  const sorted = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
  return sorted.slice(0, limit || sorted.length).map(w => `
    <article class="card">
      <h3>${safeHTML(w.year)} — ${safeHTML(w.prize)}</h3>
      <p class="meta">Project: ${safeHTML(w.project)}${w.student ? ' — ' + safeHTML(w.student) : ''}${w.category ? ' · ' + safeHTML(w.category) : ''}</p>
      ${w.link ? `<p><a class="btn" href="${safeHTML(normalizeHref(w.link))}">Read</a></p>` : ''}
    </article>`).join('');
}

const renderers = {
  events: renderEvents,
  announcements: renderAnnouncements,
  projects: renderProjects,
  members: renderMembers,
  resources: renderResources,
  prizes: renderPrizes,
  winners: renderWinners,
};

// ========== Hydrate mountpoints ==========
const mountpoints = document.querySelectorAll('[data-json][data-component]');

async function hydrateMountpoints() {
  for (const el of mountpoints) {
    const url = el.getAttribute('data-json');
    const component = el.getAttribute('data-component');
    const limit = Number(el.getAttribute('data-limit')) || undefined;
    try {
      const data = await loadJSON(url);
      el.innerHTML = renderers[component]?.(data, limit) || '';
    } catch (err) {
      el.innerHTML = `<div class="card"><p class="muted">Unable to load content. Please try again later.</p></div>`;
      console.error('Hydrate error for', url, err);
    }
  }
}

// ========== Accessible Lightbox (with focus trapping) ==========
window.initLightbox = function initLightbox() {
  if (window.__CW_SF_LIGHTBOX_API__) return window.__CW_SF_LIGHTBOX_API__;

  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.innerHTML = `
    <div class="lightbox-inner" role="dialog" aria-modal="true" aria-label="Image preview">
      <div class="content" tabindex="0"></div>
      <button class="lightbox-close" aria-label="Close">Close</button>
    </div>
  `;
  document.body.appendChild(backdrop);

  const content = backdrop.querySelector('.content');
  const closeBtn = backdrop.querySelector('.lightbox-close');

  let lastFocused = null;

  function open(src, alt = '') {
    content.innerHTML = `<img src="${safeHTML(src)}" alt="${safeHTML(alt)}" />`;
    backdrop.classList.add('open');
    lastFocused = document.activeElement;
    closeBtn.focus();
    document.addEventListener('focus', trapFocus, true);
  }

  function close() {
    backdrop.classList.remove('open');
    content.innerHTML = '';
    document.removeEventListener('focus', trapFocus, true);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function trapFocus(e) {
    if (!backdrop.contains(e.target)) {
      e.stopPropagation();
      closeBtn.focus();
    }
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  closeBtn.addEventListener('click', close);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const api = { open, close };
  window.__CW_SF_LIGHTBOX_API__ = api;
  return api;
};

function enhanceLightboxLinks() {
  const api = window.initLightbox();
  document.querySelectorAll('.lightboxable').forEach(link => {
    if (link.__cw_bound__) return;
    link.__cw_bound__ = true;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const src = link.getAttribute('href');
      const alt = link.getAttribute('data-alt') || link.querySelector('img')?.alt || 'Image';
      api.open(src, alt);
    });
  });
}

// ========== Projects page: search & filters ==========
async function setupProjectsPage() {
  const wrapper = document.getElementById('projects-page');
  if (!wrapper) return;
  const listEl = document.getElementById('project-list');
  const searchEl = document.getElementById('project-search');
  const catEl = document.getElementById('project-category');
  const gradeEl = document.getElementById('project-grade');
  const countEl = document.getElementById('project-count');
  let data = [];
  try {
    data = await loadJSON('/assets/data/projects.json');
  } catch (e) {
    if (listEl) listEl.innerHTML = `<p class="muted">Could not load projects.</p>`;
    return;
  }

  const categories = Array.from(new Set(data.flatMap(p => p.category || []))).sort();
  const grades = Array.from(new Set(data.map(p => p.grade))).sort();
  if (catEl) catEl.innerHTML = `<option value="">All categories</option>` + categories.map(c => `<option value="${safeHTML(c)}">${safeHTML(c)}</option>`).join('');
  if (gradeEl) gradeEl.innerHTML = `<option value="">All grades</option>` + grades.map(g => `<option value="${safeHTML(g)}">${safeHTML(g)}</option>`).join('');

  function apply() {
    const q = (searchEl?.value || '').toLowerCase();
    const cat = catEl?.value || '';
    const grade = gradeEl?.value || '';
    const filtered = data.filter(p => {
      const hay = [p.title, p.student, p.summary, ...(p.category || [])].join(' ').toLowerCase();
      const matchesQ = !q || hay.includes(q);
      const matchesCat = !cat || (p.category || []).includes(cat);
      const matchesGrade = !grade || p.grade === grade;
      return matchesQ && matchesCat && matchesGrade;
    });
    if (listEl) listEl.innerHTML = renderProjects(filtered);
    if (countEl) countEl.textContent = `${filtered.length} of ${data.length}`;
  }

  [searchEl, catEl, gradeEl].forEach(el => el && el.addEventListener('input', apply));
  apply();
}

// ========== Events page: category filter ==========
async function setupEventsPage() {
  const wrapper = document.getElementById('events-page');
  if (!wrapper) return;
  const listEl = document.getElementById('events-list');
  const catEl = document.getElementById('events-category');
  let data = [];
  try {
    data = await loadJSON('/assets/data/events.json');
  } catch (e) {
    if (listEl) listEl.innerHTML = `<p class="muted">Could not load events.</p>`;
    return;
  }
  const categories = Array.from(new Set(data.map(e => e.category))).sort();
  if (catEl) catEl.innerHTML = `<option value="">All types</option>` + categories.map(c => `<option value="${safeHTML(c)}">${safeHTML(c)}</option>`).join('');
  function apply() {
    const cat = catEl?.value || '';
    const filtered = !cat ? data : data.filter(e => e.category === cat);
    if (listEl) listEl.innerHTML = renderEvents(filtered);
  }
  if (catEl) catEl.addEventListener('input', apply);
  apply();
}

// ========== Main init sequence ==========
(async function init() {
  try { enhanceExistingSubmenus(); } catch (e) { console.warn('Submenu enhancement failed', e); }

  try { await hydrateMountpoints(); } catch (e) { console.error('Mountpoints hydration failed', e); }

  try { setupProjectsPage(); } catch (e) { /* nothing */ }
  try { setupEventsPage(); } catch (e) { /* nothing */ }

  try { enhanceLightboxLinks(); } catch (e) { /* nothing */ }

  // Re-enhance lightbox links when dynamic content inserted (e.g., mountpoints)
  const mo = new MutationObserver(() => { try { enhanceLightboxLinks(); } catch (err) { /* ignore */ } });
  mo.observe(document.body, { childList: true, subtree: true });
})();
