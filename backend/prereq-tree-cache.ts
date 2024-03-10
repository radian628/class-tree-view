// subjectCourse is something like CS444 or MTH251 or WR121 etc.

import { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPrereqsSyntaxTree } from "../scraper/get-prereqs";

export type PrereqTree =
  | {
      type: "and" | "or";
      prereqs: PrereqTree[];
    }
  | {
      type: "course";
      subjectCourse: string;
    };

export type PrereqTreeCacheEntry =
  | {
      type: "dne";
    }
  | {
      type: "tree";
      tree: PrereqTree;
    };

export type PrereqTreeFromBanner =
  | {
      type: "operator";
      operator: "and" | "or";
      operands: PrereqTreeFromBanner[];
    }
  | {
      type: "class";
      class: {
        subject: string;
        number: string;
      };
    };

async function convertPrereqToCourse(
  connection: Connection,
  subject: string,
  courseNumber: string
) {
  subject = subject.replace(/&amp;/g, "&");
  const fetchQuery = `SELECT * FROM Courses WHERE courseNumber = ?
      AND subjectDescription = ? LIMIT 1;`;
  let [[courseInfo]] = await connection.execute<RowDataPacket[]>(fetchQuery, [
    courseNumber,
    subject,
  ]);
  if (!courseInfo) {
    console.log("convertPrereqToCourse ERROR:", subject, courseNumber);
    return "???";
  }
  return courseInfo.subjectCourse;
}

export class PrereqTreeCache {
  map: Map<string, PrereqTreeCacheEntry>;
  conn: Connection;

  constructor() {
    this.map = new Map();
  }

  async getPrereqs(
    subjectCourse: string
  ): Promise<PrereqTreeCacheEntry | undefined> {
    // best case: prereq info is in cache
    const entry = this.map.get(subjectCourse);
    if (entry) return entry;

    // look up course info so we can query banner
    const [[courseInfo]] = await this.conn.execute<RowDataPacket[]>(
      `
    SELECT * FROM Courses
    WHERE subjectCourse = ?
    AND (scheduleTypeDescription = "Lecture"
        OR scheduleTypeDescription = "Online")
    LIMIT 1;`,
      [subjectCourse]
    );
    if (!courseInfo) return;

    // query banner for course prereq info
    const dataFromBanner = (await getPrereqsSyntaxTree(
      courseInfo.term,
      courseInfo.courseReferenceNumber
    )) as PrereqTreeFromBanner;

    async function convertBannerSyntaxTree(
      tree: PrereqTreeFromBanner
    ): Promise<PrereqTree> {
      if (tree.type === "operator") {
        return {
          type: tree.operator,
          prereqs: await Promise.all(
            tree.operands.map(convertBannerSyntaxTree)
          ),
        };
      }

      return {
        type: "course",
        subjectCourse: await convertPrereqToCourse(
          this.conn,
          this.class.subject,
          this.class.number
        ),
      };
    }
    const convertedTree = await convertBannerSyntaxTree(dataFromBanner);
  }
}
