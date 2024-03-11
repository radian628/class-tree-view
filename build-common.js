export async function createBuildContext() {
  return await esbuild.context({
    entryPoints: ["./frontend/src/index.tsx"],
    bundle: true,
    minify: true,
    sourcemap: true,
    outdir: "./frontend/build",
    plugins: [
      lessLoader(),
      copy({
        resolveFrom: "cwd",
        assets: {
          from: ["./frontend/assets/**/*"],
          to: ["./frontend/build"],
        },
        watch: true,
      }),
    ],
  });
}
