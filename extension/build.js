const esbuild = require("esbuild");
const isWatch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  platform: "browser",
  target: "chrome109",
  format: "iife",
  minify: !isWatch,
};

async function build() {
  const ctx1 = await esbuild.context({
    ...shared,
    entryPoints: ["src/background.ts"],
    outfile: "dist/background.js",
  });

  const ctx2 = await esbuild.context({
    ...shared,
    entryPoints: ["src/popup.ts"],
    outfile: "dist/popup.js",
  });

  if (isWatch) {
    await ctx1.watch();
    await ctx2.watch();
    console.log("watching...");
  } else {
    await ctx1.rebuild();
    await ctx2.rebuild();
    await ctx1.dispose();
    await ctx2.dispose();
    console.log("build complete");
  }
}

build().catch(() => process.exit(1));
