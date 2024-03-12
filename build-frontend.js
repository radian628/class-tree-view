import { createBuildContext } from "./build-common.js";

const ctx = await createBuildContext();

await ctx.watch();
