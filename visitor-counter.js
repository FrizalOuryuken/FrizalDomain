(() => {
 const output = document.querySelector('#visitor-total');
 if (!output) return;
 const panel = document.querySelector('.visitor-counter');
 const status = document.querySelector('#visitor-status');
 async function load() {
  try {
   let visitorId;
   try {
    visitorId = localStorage.getItem('frizal-visitor-id');
    if (!/^[a-f0-9-]{36}$/i.test(visitorId || '')) {
     visitorId = crypto.randomUUID();
     localStorage.setItem('frizal-visitor-id', visitorId);
    }
   } catch { visitorId = null; }
   const response = await fetch('/api/visitors', visitorId ? {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({visitorId})
   } : {method:'GET'});
   if (!response.ok) throw new Error('Unavailable');
   const data = await response.json();
   if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid count');
   output.textContent = new Intl.NumberFormat('id-ID').format(data.total);
   panel.dataset.state = 'ready';
   status.textContent = 'Satu kunjungan per browser per hari.';
  } catch {
   output.textContent = '—';
   panel.dataset.state = 'error';
   status.textContent = 'Statistik belum tersedia.';
  } finally { panel.setAttribute('aria-busy', 'false'); }
 }
 load();
})();
