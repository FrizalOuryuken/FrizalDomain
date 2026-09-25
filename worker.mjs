const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control':'no-store'}});
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/visitors') return env.ASSETS.fetch(request);
  if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'},405);
  if (!env.DB) return json({error:'Counter not configured'},503);
  try {
   if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT total FROM counter WHERE id = 1').first();
    return json({total:row?.total || 0});
   }
   if (request.headers.get('Origin') !== url.origin) return json({error:'Invalid origin'},403);
   if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'JSON required'},415);
   const raw = await request.text();
   if (raw.length > 200) return json({error:'Payload too large'},413);
   let body; try { body = JSON.parse(raw); } catch { return json({error:'Invalid JSON'},400); }
   if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body?.visitorId || '')) return json({error:'Invalid visitor'},400);
   const day = new Date().toISOString().slice(0,10);
   const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(day + ':' + body.visitorId));
   const token = Array.from(new Uint8Array(hash), n=>n.toString(16).padStart(2,'0')).join('');
   const results = await env.DB.batch([
    env.DB.prepare("DELETE FROM visits WHERE day < date(?, '-2 days')").bind(day),
    env.DB.prepare('INSERT OR IGNORE INTO visits(day, token) VALUES (?, ?)').bind(day,token),
    env.DB.prepare('SELECT total FROM counter WHERE id = 1')
   ]);
   return json({total:results[2].results[0].total});
  } catch (error) {
   console.error('Visitor counter unavailable', error.message);
   return json({error:'Counter unavailable'},503);
  }
 }
};
