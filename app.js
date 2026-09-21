"use strict";
const games = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
const search = document.querySelector('#search');
const platform = document.querySelector('#platform');
const grid = document.querySelector('#games');
const empty = document.querySelector('#empty');
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#total').textContent = String(games.length).padStart(2, '0');
function safeLink(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
[...new Set(games.map(game => game.platform).filter(Boolean))].sort().forEach(value => { const option = node('option', '', value); option.value = value; platform.append(option); });
function render() {
 const query = search.value.trim().toLocaleLowerCase('id');
 const filtered = games.filter(game => String(game.title || '').toLocaleLowerCase('id').includes(query) && (!platform.value || game.platform === platform.value));
 grid.replaceChildren();
 document.querySelector('#results').textContent = games.length ? filtered.length + ' dari ' + games.length + ' proyek' : '';
 empty.hidden = filtered.length > 0;
 empty.querySelector('h3').textContent = games.length ? 'Game tidak ditemukan' : 'Koleksi segera hadir';
 empty.querySelector('p').textContent = games.length ? 'Coba judul lain atau pilih semua platform.' : 'Proyek patch dan mod game akan ditambahkan di sini. Kembali lagi untuk menemukan petualangan berikutnya.';
 filtered.forEach(game => {
  const card = node('article', 'game-card');
  const fallback = () => node('div', 'cover cover-fallback', String(game.title || 'Game').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase());
  if (game.cover) { const img = node('img', game.coverType === 'logo' ? 'cover cover-logo' : 'cover'); img.alt = (game.coverType === 'logo' ? 'Logo ' : 'Sampul ') + game.title; img.loading = 'lazy'; img.src = game.cover; img.addEventListener('error', () => img.replaceWith(fallback()), { once: true }); card.append(img); } else { card.append(fallback()); }
  const body = node('div', 'card-body');
  body.append(node('span', 'card-meta', [game.platform, game.category, game.version].filter(Boolean).join(' · ')), node('h3', '', game.title || 'Tanpa judul'));
  function resourceSection(title, description, entries, className) {
   const section = node('section', 'resource-section ' + className);
   section.append(node('h4', '', title));
   if (description) section.append(node('p', '', description));
   const links = node('div', 'card-links');
   entries.forEach(([label, value]) => { const href = safeLink(value); if (href) { const a = node('a', '', label); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a); } });
   if (!links.childElementCount) links.append(node('span', 'card-meta', 'Link belum tersedia'));
   section.append(links);
   return section;
  }
  const patchSection = resourceSection(game.resourceTitle || 'Patch / mod', game.description || 'Lihat detail dan petunjuk pemasangan proyek.', [[game.resourceLabel || 'Buka patch / mod ↗', game.url], ['Panduan instalasi', game.guideUrl]], 'translation-section');
  if (Array.isArray(game.versionHistory) && game.versionHistory.length) {
   const history = node('details', 'version-history');
   history.append(node('summary', '', 'Version history'));
   const entries = node('ol', 'version-entries');
   game.versionHistory.forEach(release => {
    const item = node('li');
    item.append(node('h5', '', release.version + ' (' + release.date + ')'), node('p', '', release.changes));
    entries.append(item);
   });
   history.append(entries);
   patchSection.append(history);
  }
  body.append(patchSection);
  if (game.downloadUrl) body.append(resourceSection('Download game', game.downloadNote, [['Download game ↗', game.downloadUrl]], 'download-section'));
  card.append(body); grid.append(card);
 });
}
search.addEventListener('input', render); platform.addEventListener('change', render); render();
// 