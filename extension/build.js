const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

const sharedOptions = {
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  minify: false,
};

const targets = [
  { entryPoints: ['src/background.ts'], outfile: 'dist/background.js' },
  { entryPoints: ['src/popup.ts'],      outfile: 'dist/popup.js' },
  { entryPoints: ['src/content.ts'],    outfile: 'dist/content.js' },
];

function copyStatics() {
  if (!fs.existsSync('dist')) fs.mkdirSync('dist');
  fs.copyFileSync('popup.html', 'dist/popup.html');
  fs.copyFileSync('manifest.json', 'dist/manifest.json');
  console.log('✓ Static files copied');
}

async function build() {
  await Promise.all(targets.map(t => esbuild.build({ ...sharedOptions, ...t })));
  copyStatics();
  console.log('✓ Build complete');
}

async function watch() {
  const ctxs = await Promise.all(
    targets.map(t =>
      esbuild.context({
        ...sharedOptions,
        ...t,
        sourcemap: 'inline',
        plugins: [{
          name: 'on-rebuild',
          setup(build) {
            build.onEnd(() => console.log('✓ Rebuilt', t.outfile));
          },
        }],
      })
    )
  );
  await Promise.all(ctxs.map(ctx => ctx.watch()));
  copyStatics();
  console.log('Watching for changes...');
}

if (isWatch) {
  watch().catch(e => { console.error(e); process.exit(1); });
} else {
  build().catch(e => { console.error(e); process.exit(1); });
}
