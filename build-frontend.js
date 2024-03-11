import * as esbuild from "esbuild";
import { lessLoader } from "esbuild-plugin-less";
import { copy } from "esbuild-plugin-copy";

const ctx = await createBuildContext();

await ctx.watch();
