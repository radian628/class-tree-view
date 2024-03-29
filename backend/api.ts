import { initTRPC } from "@trpc/server";
import { PrereqTreeCache } from "./prereq-tree-cache.js";
import { getMajorRequirements, getSupportedMajors, getSupportedOptions } from "./get-major-requirements.js";
import { Connection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { TermsCache } from "./terms-cache.js";
import {
  COURSE_SECTIONS_SQL,
  LATEST_COURSES_SQL_1,
  LATEST_COURSES_SQL_2,
} from "./course-io.js";
import { CourseRaw } from "./load-courses.js";

const t = initTRPC.create();

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export function createAPI(
  conn: Connection,
  caches: {
    prereqTreeCache: PrereqTreeCache;
    termsCache: TermsCache;
  }
) {
  const { prereqTreeCache, termsCache } = caches;

  const api = t.router({
    prereq: t.procedure.input(z.string()).query(async (opts) => {
      const prereqs = await prereqTreeCache.getDirectPrereqs(opts.input);

      return prereqs;
    }),
    terms: t.procedure.query(async (opts) => {
      return await termsCache.getTerms();
    }),
    getExactCourse: t.procedure.input(z.string()).query(async (opts) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `
          SELECT * from Courses
            WHERE SubjectCourse = ?
            ORDER BY term DESC
            LIMIT 1
        `,
        [opts.input]
      );

      return rows[0] as CourseRaw | undefined;
    }),
    latestCourse: t.procedure
      .input(
        z.object({
          query: z.string(),
          limit: z.number(),
          offset: z.number(),
        })
      )
      .query(async (opts) => {
        await conn.query(LATEST_COURSES_SQL_1, [opts.input.query]);
        const [rows] = await conn.query<RowDataPacket[]>(LATEST_COURSES_SQL_2, [
          clamp(opts.input.limit, 1, 500),
          opts.input.offset,
        ]);

        return rows as CourseRaw[];
      }),
    courseSections: t.procedure
      .input(
        z.object({
          subjectCourse: z.string(),
          limit: z.number(),
          offset: z.number(),
        })
      )
      .query(async (opts) => {
        const [rows] = await conn.query<RowDataPacket[]>(COURSE_SECTIONS_SQL, [
          opts.input.subjectCourse,
          clamp(opts.input.limit, 1, 500),
          opts.input.offset,
        ]);

        return rows as CourseRaw[];
      }),
      getSupportedOptions: t.procedure.input(z.string()).query(async (opts) => {
          let options = await getSupportedOptions(opts.input);
          return await options;
      }),
      getMajorRequirements: t.procedure.input(
          z.object({
              major: z.string(),
              option: z.string().optional(),
          })
      ).query(async (opts) => {
        return await getMajorRequirements(opts.input.major, opts.input.option);
      }),
      getSupportedMajors: t.procedure.query(async (opts) => {
        return getSupportedMajors();
      }),
  });

  return api;
}

export type AppRouter = ReturnType<typeof createAPI>;
