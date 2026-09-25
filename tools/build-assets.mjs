import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'site-dist');
const sources = ['index.html','style.css','app.js','games.js','blog.js','visitor-counter.js','favicon.svg','images'];
async function copy(relative) {
 const source = path.join(root, relative);
 const destination = path.join(output, relative);
 const { stat } = await import('node:fs/promises');
 if ((await stat(source)).isDirectory()) {
  await mkdir(destination, {recursive:true});
  for (const name of await readdir(source)) await copy(path.join(relative,name));
 } else {
  const data = await readFile(source);
  let current; try { current = await readFile(destination); } catch {}
  if (!current || !current.equals(data)) {
   await mkdir(path.dirname(destination), {recursive:true});
   await writeFile(destination, data);
  }
 }
}
await mkdir(output, {recursive:true});
for (const source of sources) await copy(source);
console.log('Site assets ready: site-dist');