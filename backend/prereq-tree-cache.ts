// subjectCourse is something like CS444 or MTH251 or WR121 etc.

import { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPrereqsSyntaxTree } from "../scraper/get-prereqs.js";

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
      timestamp: number;
    }
  | {
      type: "tree";
      tree: PrereqTree;
      timestamp: number;
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

// given a subject (e.g. Mathematics) and a course number (e.g. 251)
// get the subjectCourse (e.g. MTH251)
async function convertPrereqToCourse(
  connection: Connection,
  subject: string,
  courseNumber: string
) {
  // because it doesn't seem to like ECE courses in particular
  if (subject === "Electrical & Computer Engineer") return `ECE${courseNumber}`;

  //subject = subject.replace(/&amp;/g, "&");
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

  constructor(conn: Connection) {
    this.conn = conn;
    this.map = new Map();
  }

  setDNE(subjectCourse: string) {
    const dne: PrereqTreeCacheEntry = { type: "dne", timestamp: Date.now() };
    this.map.set(subjectCourse, dne);
    return dne;
  }

  // convert a syntax tree--- freshly converted from Banner's HTML garbage---
  // into a nicer tree
  async convertBannerSyntaxTree(
    tree: PrereqTreeFromBanner
  ): Promise<PrereqTree> {
    if (tree.type === "operator") {
      return {
        type: tree.operator,
        prereqs: await Promise.all(
          tree.operands.map(this.convertBannerSyntaxTree.bind(this))
        ),
      };
    }

    return {
      type: "course",
      subjectCourse: await convertPrereqToCourse(
        this.conn,
        tree.class.subject,
        tree.class.number
      ),
    };
  }

  async getDirectPrereqs(subjectCourse: string): Promise<PrereqTreeCacheEntry> {
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
    ORDER BY term DESC
    LIMIT 1;`,
      [subjectCourse]
    );
    if (!courseInfo) return this.setDNE(subjectCourse);

    // query banner for course prereq info
    const dataFromBanner = (await getPrereqsSyntaxTree(
      courseInfo.term,
      courseInfo.courseReferenceNumber
    )) as PrereqTreeFromBanner | undefined;
    if (!dataFromBanner) return this.setDNE(subjectCourse);

    // convert tree and use newly-generated cache entry
    const convertedTree = await this.convertBannerSyntaxTree(dataFromBanner);
    const newCacheEntry: PrereqTreeCacheEntry = {
      type: "tree",
      tree: convertedTree,
      timestamp: Date.now(),
    };
    this.map.set(subjectCourse, newCacheEntry);

    return newCacheEntry;
  }
}
