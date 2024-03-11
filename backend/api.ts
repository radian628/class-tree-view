import { initTRPC } from "@trpc/server";
import { PrereqTreeCache } from "./prereq-tree-cache.js";
import { Connection } from "mysql2/promise";
import { z } from "zod";

const t = initTRPC.create();

export function createAPI(conn: Connection) {
  const prereqTreeCache = new PrereqTreeCache(conn);

  const api = t.router({
    prereq: t.procedure.input(z.string()).query(async (opts) => {
      const prereqs = await prereqTreeCache.getDirectPrereqs(opts.input);

      return prereqs;
    }),
  });

  return api;
}

export type AppRouter = ReturnType<typeof createAPI>;
