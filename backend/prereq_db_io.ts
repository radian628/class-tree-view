import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { convertPrereqToCourse } from "./build_prereqs";
import { getPrereqsSyntaxTree } from "../scraper/get-prereqs";

export async function insertIntoRequirements(
  connection: mysql.Connection,
  operation: "and" | "or"
) {
  return await connection.execute<ResultSetHeader>(
    `
  INSERT INTO Requirements (booleanType) VALUES (?);`,
    [operation]
  );
}

export async function insertIntoPrerequisites(
  connection: mysql.Connection,
  ancestor: number,
  descendant: number
) {
  return await connection.execute<ResultSetHeader>(
    `
  INSERT INTO Prerequisites
    (ancestor, descendant)
  VALUES
    (?, ?);
  `,
    [ancestor, descendant]
  );
}

export async function insertIntoCourseRequirements(
  connection: mysql.Connection,
  subjectCourse: string,
  requirementID: number
) {
  return await connection.execute<ResultSetHeader>(
    `INSERT INTO CourseRequirements
      (subjectCourse, requirementID)
    VALUES
      (?, ?);`,
    [subjectCourse, requirementID]
  );
}

export async function selectFromRequirements(
  connection: mysql.Connection,
  id: number
) {
  return await connection.execute<ResultSetHeader>(
    `
    SELECT * FROM Requirements
      WHERE id = ?
  `,
    [id]
  );
}

export async function selectPrerequisitesOfRequirement(
  connection: mysql.Connection,
  ancestorID: number
) {
  return await connection.execute<RowDataPacket[]>(
    `
  SELECT * FROM Prerequisites
    WHERE ancestor = ?`,
    [ancestorID]
  );
}

export async function getRequirementFromCourse(
  connection: mysql.Connection,
  subjectCourse: string
) {
  return await connection.execute<RowDataPacket[]>(
    `
  SELECT * FROM CourseRequirements
    where subjectCourse = ?`,
    [subjectCourse]
  );
}

export async function getRequirementFromID(
  connection: mysql.Connection,
  id: number
) {
  return await connection.execute<RowDataPacket[]>(
    `
  SELECT * FROM CourseRequirements
    where requirementID = ?`,
    [id]
  );
}

export type RawPrereqTree =
  | {
      type: "operator";
      operator: "and" | "or";
      operands: RawPrereqTree[];
    }
  | {
      type: "class";
      class: {
        subject: string;
        number: string;
      };
    };

export type PrereqTree =
  | {
      type: "operator";
      operator: "and" | "or";
      prereqs: PrereqTree[];
    }
  | {
      type: "req";
      id: number;
    }
  | {
      type: "nonexistent";
    };

export async function fetchPrereqTree(
  connection: mysql.Connection,
  reqID: number
) {
  // TODO: properly handle "requirement doesn't exist" edge case
  const [requirement] = await getRequirementFromID(connection, reqID);
  const [prereqs] = await selectPrerequisitesOfRequirement(connection, reqID);

  // edge case: no prereqs
  if (prereqs.length === 0) return undefined;

  // edge case where req has a single child
  if (prereqs.length === 1)
    return {
      type: "req",
      id: reqID,
    };

  // ANDs and ORs
  const operator = requirement[0].booleanType;
  return {
    type: "operator",
    operator,
    prereqs: prereqs.map((p) => fetchPrereqTree(connection, p.descendent)),
  };
}

export async function getRepresentativeExampleCourseSection(
  connection: mysql.Connection,
  subjectCourse: string
): Promise<
  | {
      term: string;
      courseReferenceNumber: string;
    }
  | undefined
> {
  const [[courseInfo]] = await connection.execute<RowDataPacket[]>(
    `
        SELECT * FROM Courses
        WHERE subjectCourse = ?
        AND (scheduleTypeDescription = "Lecture"
            OR scheduleTypeDescription = "Online")
        LIMIT 1;`,
    [subjectCourse]
  );

  if (!courseInfo) {
    console.log("populatePrereqs ERROR:", subjectCourse);
    return undefined;
  }

  return {
    term: courseInfo.term,
    courseReferenceNumber: courseInfo.courseReferenceNumber,
  };
}

// given a "raw" tree scraped from banner (and parsed from HTML),
// add it to the DB
async function addRawTreeToDatabase(
  connection: mysql.Connection,
  tree: RawPrereqTree,
  ancestorID?: number
): Promise<void> {
  if (tree.type === "operator") {
    // add this node's requirement
    const [req] = await insertIntoRequirements(connection, tree.operator);

    await Promise.all([
      // associate this node with its prereq
      ...(ancestorID !== undefined
        ? [insertIntoPrerequisites(connection, ancestorID, req.insertId)]
        : []),

      // add children
      ...tree.operands.map(
        async (op) => await addRawTreeToDatabase(connection, op, req.insertId)
      ),
    ]);
  } else if (tree.type === "class") {
    const subjectCourse = `${await convertPrereqToCourse(
      tree.class.subject,
      tree.class.number
    )}${tree.class.number}`;

    // create the class requirement
    const [req] = await insertIntoRequirements(connection, "and");

    await Promise.all([
      // associate the class with the requirement
      insertIntoCourseRequirements(connection, subjectCourse, req.insertId),

      // add the requirement to the prereq list
      ...(ancestorID !== undefined
        ? [insertIntoPrerequisites(connection, ancestorID, req.insertId)]
        : []),
    ]);
  }
}

export async function fetchCoursePrereqTree(
  connection: mysql.Connection,
  subject: string,
  number: string
): Promise<PrereqTree> {
  const subjectCourse = `${await convertPrereqToCourse(
    subject,
    number
  )}${number}`;

  const [requirement] = await getRequirementFromCourse(
    connection,
    subjectCourse
  );

  // course does not exist in DB; fetch from Banner
  if (!requirement) {
    const section = await getRepresentativeExampleCourseSection(
      connection,
      subjectCourse
    );
    if (!section)
      return {
        type: "nonexistent",
      };
    const rawTree = (await getPrereqsSyntaxTree(
      section.term,
      section.courseReferenceNumber
    )) as RawPrereqTree | undefined;
    if (!rawTree)
      return {
        type: "nonexistent",
      };

    await addRawTreeToDatabase(connection, rawTree);

    return await fetchCoursePrereqTree(connection, subject, number);
  }
}

// export async function recursivelyLoadCoursePrereqTreeIntoDatabase(
//   connection: mysql.Connection,
//   // long subject name (e.g. "Mathematics")
//   subject: string,
//   // course number (e.g. "251")
//   number: string,
//   // try to fetch prereq tree from DB
//   // get from banner if fail
//   fetchCoursePrereqTree: (
//     subject: string,
//     number: string
//   ) => Promise<RawPrereqTree | undefined>
// ) {
//   async function traverseTree(tree: RawPrereqTree | undefined) {
//     // base case: no prereqs
//     if (!tree) return;

//     // recursively load prereqs
//     switch (tree.type) {
//       case "operator":
//         return await Promise.all(tree.operands.map((o) => traverseTree(o)));
//       case "class":
//         return await recursivelyLoadCoursePrereqTreeIntoDatabase(
//           connection,
//           tree.class.subject,
//           tree.class.number,
//           fetchCoursePrereqTree
//         );
//     }
//   }
//   return await traverseTree(await fetchCoursePrereqTree(subject, number));
// }
