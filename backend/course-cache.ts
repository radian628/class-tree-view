import { Connection } from "mysql2/promise";
import { CourseRaw, getDataForTerm } from "./load-courses.js";
import { TermsCache } from "./terms-cache.js";
import * as fs from "node:fs/promises";

const oneDay = 1000 * 60 * 60 * 24;

async function exists(path: string) {
  return await fs
    .access(path)
    .then(() => true)
    .catch(() => false);
}

// async delay
function delay(ms: number) {
  return new Promise((res, rej) => {
    setTimeout(res, ms);
  });
}

export class CourseCache {
  conn: Connection;
  termsCache: TermsCache;

  constructor(conn: Connection, termsCache: TermsCache) {
    this.conn = conn;
    this.termsCache = termsCache;

    this.loop();
  }

  async loop() {
    const terms = await this.termsCache.getTerms();

    // banner -> file cache
    for (let i = 0; i < terms.length; i++) {
      const path = `/app/cache/courses-${terms[i].code}.json`;

      let shouldRedo = false;
      // if (i < 3) {
      //   shouldRedo = true;
      // }
      if (!(await exists(path))) {
        shouldRedo = true;
      } else {
        console.log(
          `Skipping term ${terms[i].code} (cached file already exists)`
        );
      }

      if (shouldRedo) {
        // fetch course data from banner
        const courses = (await getDataForTerm(terms[i].code))
          .map((c) => c.data)
          .flat(1);

        await fs.writeFile(path, JSON.stringify(courses));

        // wait a minute to give the server a break
        await delay(1000 * 60);
      }
    }

    // file cache -> db
    for (const { code } of terms) {
      const path = `/app/cache/courses-${code}.json`;

      fs.readFile(path).then(async (data: Buffer) => {
        const courses: CourseRaw[] = JSON.parse(data.toString());

        // insert course data into DB
        const insertQuery = `
      INSERT INTO 
        Courses (term, courseReferenceNumber, courseNumber, subject, courseTitle, subjectCourse, scheduleTypeDescription, subjectDescription)
      VALUES ?;`;
        await this.conn.query(insertQuery, [
          courses.map((course) => [
            course.term,
            course.courseReferenceNumber,
            course.courseNumber,
            course.subject,
            course.courseTitle.replace(/&amp;/g, "&"),
            course.subjectCourse,
            course.scheduleTypeDescription,
            course.subjectDescription,
          ]),
        ]);
      });
    }

    // get data from banner once per day
    setTimeout(() => {
      this.loop();
    }, oneDay);
  }
}
