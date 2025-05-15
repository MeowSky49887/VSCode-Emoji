// esbuild.js
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Basic esbuild problem matcher plugin
// See: https://code.visualstudio.com/api/working-with-extensions/bundling-extension#using-esbuild
/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) { // Ensure location is not null
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      if (watch && result.errors.length === 0) { // Check for errors before logging success in watch mode
        console.log('[watch] build finished successfully');
      } else if (!watch && result.errors.length === 0) {
        console.log('Build finished successfully');
      } else if (result.errors.length > 0) {
        console.log('[watch] build failed');
      }
    });
  },
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['extension.js'], // Your main extension file
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'], // Exclude the vscode module
    platform: 'node', // For VS Code extensions
    format: 'cjs', // CommonJS format
    minify: production,
    sourcemap: !production, // Create sourcemaps for dev builds
    sourcesContent: false, // Optional: don't include original source in sourcemaps
    logLevel: 'warning', // Adjust as needed
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
