import { mkdir, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
for (const file of ['index.html', '.nojekyll']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
}
await cp(`${root}/src`, new URL('src/', output), { recursive: true });
await cp(`${root}/images/web`, new URL('images/web/', output), { recursive: true });
await copyFile(new URL('../images/banner_v3.png', import.meta.url), new URL('images/banner_v3.png', output));
await copyFile(new URL('../images/favicon-128.png', import.meta.url), new URL('images/favicon-128.png', output));
console.log('Built static website in dist/ (no runtime dependencies).');
