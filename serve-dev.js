import * as esbuild from "esbuild";
import { lessLoader } from "esbuild-plugin-less";
import { copy } from "esbuild-plugin-copy";
import { createBuildContext } from "./build-common";

const ctx = await createBuildContext();

let { host, port } = await ctx.serve({
  servedir: "./frontend/build",
});
