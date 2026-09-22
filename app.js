"use strict";
const collections = { game: Array.isArray(window.PROJECTS) ? window.PROJECTS : [], blog: Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : [] };
let activeTab = 'game';
let games = collections.game;

const search = document.querySelector('#search');
const gameFilter = document.querySelector('#game-filter');
const seriesFilter = document.querySelector('#series-filter');
const platform = document.querySelector('#platform');
const prioritizePinned = document.querySelector('#prioritize-pinned');
const sortOrder = document.querySelector('#sort-order');
const publishDate = game => { const date = new Date((game.publishedAt || '') + 'T00:00:00Z'); return Number.isNaN(date.getTime()) ? null : date; };
function comparePublished(a, b) {
 const left = publishDate(a), right = publishDate(b);
 if (!left) return right ? 1 : 0;
 if (!right) return -1;
 return sortOrder.value === 'asc' ? left - right : right - left;
}
function compareProjects(a, b) {
 if (!prioritizePinned.checked) return comparePublished(a, b);
 const aState = a, bState = b;
 const aPinned = aState.pinned === true, bPinned = bState.pinned === true;
 if (aPinned !== bPinned) return aPinned ? -1 : 1;
 if (aPinned) {
  const priority = project => Number.isFinite(project.pin_number) ? project.pin_number : Infinity;
  const left = priority(aState), right = priority(bState);
  if (left !== right) return left < right ? -1 : 1;
 }
 return comparePublished(a, b);
}
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const typeFilter = document.querySelector('#item-type');
const getItems = game => Array.isArray(game.items) ? game.items : [];
const getTypes = item => [...new Set((Array.isArray(item.type) ? item.type : [item.type]).filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
const visibleItems = game => getItems(game).filter(item => !typeFilter.value || getTypes(item).includes(typeFilter.value));
const grid = document.querySelector('#games');
const empty = document.querySelector('#empty');
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#total').textContent = String(games.length).padStart(2, '0');
function safeLink(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
function refreshFilters() {
 for (const [control, values, label] of [
  [platform, games.map(p => p.platform), 'Semua platform'],
  [gameFilter, games.map(p => p.game), 'Semua game'],
  [seriesFilter, games.map(p => p.series), 'Semua seri'],
  [typeFilter, games.flatMap(p => getItems(p).flatMap(getTypes)), 'Semua tipe']
 ]) {
  control.replaceChildren();
  const all = node('option', '', label); all.value = ''; control.append(all);
  [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')).forEach(value => {const option=node('option','',value);option.value=value;control.append(option);});
  control.value = '';
 }
}
function selectTab(tab) {
 activeTab = tab; games = collections[tab]; search.value = '';
 document.querySelectorAll('[data-collection]').forEach(button => {
  const selected = button.dataset.collection === tab;
  button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
 });
 document.querySelector('#collection-panel').setAttribute('aria-labelledby', 'tab-' + tab);
 document.querySelector('#collection-title').textContent = tab === 'blog' ? 'Blog & informasi' : 'Arsip proyek';
 document.querySelector('#collection-description').textContent = tab === 'blog' ? 'Catatan, panduan, dan informasi seputar game.' : 'Patch, mod, dan translasi dalam satu tempat.';
 document.querySelector('#search-caption').textContent = tab === 'blog' ? 'Cari informasi' : 'Cari game';
 search.placeholder = tab === 'blog' ? 'Ketik judul informasi…' : 'Ketik judul game…';
 refreshFilters(); render();
}
function youtubeId(value) {
 try {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
   const parts = url.pathname.split('/');
   id = url.pathname === '/watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(parts[1]) ? parts[2] : null;
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
 } catch { return null; }
}
function openMediaLightbox(media, startIndex, title) {
 let index = startIndex;
 const item = media[index];
 if (!item) return;
 const dialog = node('dialog', 'media-lightbox');
 dialog.setAttribute('aria-label', item.alt || 'Media ' + title);
 const close = node('button', 'lightbox-close', '×');
 close.type = 'button'; close.setAttribute('aria-label', 'Tutup media');
 const content = node('div', 'lightbox-content');
 const counter = node('span', 'lightbox-counter');
 counter.setAttribute('aria-live', 'polite');
 function showMedia() {
  content.replaceChildren();
  const item = media[index];
  dialog.setAttribute('aria-label', item.alt || 'Media ' + title);
  counter.textContent = (index + 1) + ' / ' + media.length;
 if (item.type === 'youtube' || item.type === 'video') {
  const id = youtubeId(item.url);
  if (!id) { content.append(node('p', '', 'Link YouTube tidak valid.')); return; }
  const frame = node('iframe', 'lightbox-video');
  frame.src = 'https://www.youtube-nocookie.com/embed/' + id;
  frame.title = item.alt || 'Video ' + title;
  frame.allowFullscreen = true;
  frame.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  content.append(frame);
 } else {
  const img = node('img', 'lightbox-image');
  img.src = item.url; img.alt = item.alt || 'Gambar ' + title;
  img.addEventListener('error', () => img.replaceWith(node('p', '', 'Gambar tidak dapat dimuat.')), {once:true});
  content.append(img);
 }
 }
 showMedia();
 const opener = document.activeElement;
 const previousOverflow = document.body.style.overflow;
 let closing = false;
 let closeTimer;
 function requestClose() {
  if (closing) return;
  closing = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { dialog.close(); return; }
  dialog.classList.add('is-closing');
  content.addEventListener('animationend', event => {
   if (event.target === content && event.animationName === 'lightbox-zoom-out' && dialog.open) dialog.close();
  });
  closeTimer = window.setTimeout(() => { if (dialog.open) dialog.close(); }, 260);
 }
 close.addEventListener('click', requestClose);
 dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
 dialog.addEventListener('click', event => { if (event.target === dialog) requestClose(); });
 dialog.addEventListener('close', () => {
  window.clearTimeout(closeTimer);
  dialog.remove(); // Remove video iframe to stop playback.
  document.body.style.overflow = previousOverflow;
  if (opener && opener.isConnected) opener.focus();
 }, {once:true});
 dialog.append(close, content);
 if (media.length > 1) {
  const previous = node('button', 'lightbox-nav lightbox-previous', '←');
  const next = node('button', 'lightbox-nav lightbox-next', '→');
  previous.type = next.type = 'button';
  previous.setAttribute('aria-label', 'Media sebelumnya');
  next.setAttribute('aria-label', 'Media berikutnya');
  function move(delta) {
   if (closing) return;
   index = (index + delta + media.length) % media.length;
   showMedia();
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => {
   if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); event.stopPropagation();
    move(event.key === 'ArrowLeft' ? -1 : 1);
   }
  });
  dialog.append(previous, counter, next);
 }
 document.body.append(dialog);
 dialog.showModal(); document.body.style.overflow = 'hidden'; close.focus();
}

function renderMedia(game) {
 const media = Array.isArray(game.media) ? game.media : game.cover ? [{type:'image', url:game.cover, fit:game.coverType === 'logo' ? 'contain' : 'cover'}] : [];
 const wrapper = node('div', 'project-media');
 const stage = node('div', 'media-stage');
 const fallback = () => node('div', 'cover cover-fallback', String(game.title || 'Game').split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase());
 let index = 0;
 const count = node('span', 'media-count');
 count.setAttribute('aria-live', 'polite');
 function show() {
  stage.replaceChildren(); // Removing the iframe stops playback on slide change.
  const item = media[index];
  if (!item) { stage.append(fallback()); return; }
  if (item.type === 'youtube' || item.type === 'video') {
   const id = youtubeId(item.url);
   if (id) {
    const play = node('button', 'media-video-preview');
    play.type = 'button';
    play.setAttribute('aria-label', 'Buka video ' + game.title);
    const thumbnail = node('img', 'youtube-thumbnail');
    thumbnail.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    thumbnail.alt = ''; thumbnail.loading = 'lazy';
    thumbnail.addEventListener('error', () => thumbnail.remove(), {once:true});
    play.append(thumbnail, node('span', 'video-play-icon', '▶'), node('span', 'video-preview-caption', item.alt || 'Tonton video'));
    play.addEventListener('click', () => openMediaLightbox(media, index, game.title));
    stage.append(play);
   } else stage.append(node('div', 'media-error', 'Link YouTube tidak valid.'));
  } else if (item.type === 'image' && item.url) {
   const img = node('img', item.fit === 'contain' ? 'cover cover-logo' : 'cover');
   img.src = item.url; img.alt = item.alt || 'Gambar ' + game.title;
   img.loading = 'lazy';
   img.addEventListener('error', () => img.replaceWith(fallback()), {once:true});
   const enlarge = node('button', 'media-enlarge');
   enlarge.type = 'button';
   enlarge.setAttribute('aria-label', 'Perbesar ' + img.alt);
   enlarge.addEventListener('click', () => openMediaLightbox(media, index, game.title));
   enlarge.append(img); stage.append(enlarge);
  } else stage.append(fallback());
  count.textContent = (index + 1) + ' / ' + media.length;
 }
 wrapper.append(stage);
 if (media.length > 1) {
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-roledescription', 'carousel');
  wrapper.setAttribute('aria-label', 'Media ' + game.title);
  const controls = node('div', 'media-controls');
  const previous = node('button', '', '←');
  const next = node('button', '', '→');
  previous.type = next.type = 'button';
  previous.setAttribute('aria-label', 'Media sebelumnya');
  next.setAttribute('aria-label', 'Media berikutnya');
  function move(delta) { index = (index + delta + media.length) % media.length; show(); }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  controls.addEventListener('keydown', event => {
   if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  controls.append(previous, count, next); wrapper.append(controls);
 }
 show(); return wrapper;
}

function render() {
 document.querySelector('#total').textContent = String(games.length).padStart(2, '0');
 const query = search.value.trim().toLocaleLowerCase('id');
 const filtered = games.filter(game => [game.title, game.game, game.series].filter(Boolean).join(' ').toLocaleLowerCase('id').includes(query) && (!gameFilter.value || game.game === gameFilter.value) && (!seriesFilter.value || game.series === seriesFilter.value) && (!platform.value || game.platform === platform.value) && (!typeFilter.value || visibleItems(game).length > 0));
 filtered.sort(compareProjects);
 grid.replaceChildren();
 document.querySelector('#results').textContent = games.length ? filtered.length + ' dari ' + games.length + (activeTab === 'blog' ? ' artikel' : ' proyek') : '';
 empty.hidden = filtered.length > 0;
 empty.querySelector('h3').textContent = games.length ? 'Tidak ada hasil' : 'Nothing here yet';
 empty.querySelector('p').textContent = games.length ? 'Coba kata pencarian lain atau pilih Semua pada filter.' : 'The author must be so lazy to add something';
 empty.querySelector('p').hidden = false;
 filtered.forEach(game => {
  const card = node('article', 'game-card');
  if (activeTab !== 'blog' || game.cover || (game.media && game.media.length)) card.append(renderMedia(game));
  const body = node('div', 'card-body');
  const title = node('h3', '', game.title || 'Tanpa judul');
  if (game.pinned === true) {
   const pin = node('span', 'title-pin', '📌');
   pin.title = 'Disematkan';
   pin.setAttribute('role', 'img');
   pin.setAttribute('aria-label', 'Disematkan');
   title.append(pin);
  }
  body.append(node('span', 'card-meta', [game.platform, game.version].filter(Boolean).join(' · ')), title);
  if (game.game || game.series) body.append(node('div', 'project-taxonomy', [game.series && 'Seri: ' + game.series, game.game && 'Game: ' + game.game].filter(Boolean).join(' · ')));
  const published = publishDate(game);
  if (published) {
   const date = node('time', 'publish-date', 'Publish: ' + dateFormat.format(published));
   date.dateTime = game.publishedAt;
   body.append(date);
  }
  if (game.description) body.append(node('p', 'post-description', game.description));
  if (game.content) {
   const paragraphs = Array.isArray(game.content) ? game.content : String(game.content).split(/\n\s*\n/);
   const article = node('div', 'post-content');
   paragraphs.forEach(text => article.append(node('p', '', text)));
   body.append(article);
  }
  function resourceSection(title, description, entries, className) {
   const section = node('section', 'resource-section ' + className);
   section.append(node('h4', '', title));
   if (description) section.append(node('p', '', description));
   const links = node('div', 'card-links');
   entries.forEach(([label, value]) => { const href = safeLink(value); if (href) { const a = node('a', '', label); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a); } });
   if (!links.childElementCount && activeTab !== 'blog') links.append(node('span', 'card-meta', 'Link belum tersedia'));
   section.append(links);
   return section;
  }
  const groups = new Map();
  visibleItems(game).forEach(item => {
   const section = resourceSection(item.title || getTypes(item).join(' · ') || 'Link proyek', item.description, (Array.isArray(item.links) ? item.links : []).map(link => [link.label || 'Buka link ↗', link.url]), 'item-section');
   const types = getTypes(item);
   if (types.length) {
    const tags = node('div', 'item-types');
    types.forEach(type => tags.append(node('span', 'item-type', type)));
    section.prepend(tags);
   }
   if (Array.isArray(item.versionHistory) && item.versionHistory.length) {
    const history = node('details', 'version-history');
    history.append(node('summary', '', 'Version history'));
    const entries = node('ol', 'version-entries');
    item.versionHistory.forEach(release => {
     const entry = node('li');
     entry.append(node('h5', '', release.version + ' (' + release.date + ')'), node('p', '', release.changes));
     entries.append(entry);
    });
    history.append(entries); section.append(history);
   }
   if (item.group) {
    if (!groups.has(item.group)) {
     const accordion = node('details', 'extra-links');
     accordion.append(node('summary', '', item.group));
     accordion.open = Boolean(typeFilter.value);
     groups.set(item.group, accordion);
    }
    groups.get(item.group).append(section);
   } else {
    body.append(section);
   }
  });
  groups.forEach(accordion => body.append(accordion));
  card.append(body); grid.append(card);
 });
}
gameFilter.addEventListener('change', render); seriesFilter.addEventListener('change', render); search.addEventListener('input', render); platform.addEventListener('change', render); typeFilter.addEventListener('change', render); sortOrder.addEventListener('change', render); prioritizePinned.addEventListener('change', render);
document.querySelectorAll('[data-collection]').forEach(button => {
 button.addEventListener('click', () => selectTab(button.dataset.collection));
 button.addEventListener('keydown', event => {
  if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
   event.preventDefault();
   const tab = event.key === 'Home' ? 'game' : event.key === 'End' ? 'blog' : activeTab === 'game' ? 'blog' : 'game';
   selectTab(tab); document.querySelector('#tab-' + tab).focus();
  }
 });
});
selectTab('game');
// 
// One compact floating link docks into the original donation button.
(() => {
 const original = document.querySelector('.donation-button');
 if (!original) return;
 const floating = original.cloneNode(true);
 floating.classList.add('donation-floating');
 document.body.append(floating);
 let scheduled = false;
 function update() {
  scheduled = false;
  const rect = original.getBoundingClientRect();
  const height = window.innerHeight;
  const width = window.innerWidth;
  const margin = width <= 560 ? 26 : 38;
  const baseWidth = Math.min(204, width - margin * 2);
  const baseHeight = 42;
  const progress = Math.max(0, Math.min(1, (height - margin + 140 - rect.bottom) / 140));
  const docked = progress === 1;
  const lerp = (a, b) => a + (b - a) * progress;
  floating.style.left = lerp(width - baseWidth - margin, rect.left) + 'px';
  floating.style.top = lerp(height - baseHeight - margin, rect.top) + 'px';
  floating.style.width = lerp(baseWidth, rect.width) + 'px';
  floating.style.height = lerp(baseHeight, rect.height) + 'px';
  floating.style.fontSize = lerp(12, 14) + 'px';
  original.style.visibility = docked ? '' : 'hidden';
  floating.style.visibility = docked ? 'hidden' : 'visible';
  if (docked && document.activeElement === floating) original.focus({preventScroll:true});
  if (!docked && document.activeElement === original) floating.focus({preventScroll:true});
 }
 function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
 window.addEventListener('scroll', schedule, {passive:true});
 window.addEventListener('resize', schedule);
 new ResizeObserver(schedule).observe(document.body);
 update();
})();
