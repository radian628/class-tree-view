import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import {
  getPrereqsRaw,
  getPrereqs,
  getPrereqsSyntaxTree,
} from "../scraper/get-prereqs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// "Computer Science", "162H" -> CS162H
export async function convertPrereqToCourse(subject, courseNumber) {
  subject = subject.replace(/&amp;/g, "&");
  const fetchQuery = `SELECT * FROM Courses WHERE courseNumber = '${courseNumber}'
    AND subjectDescription = "${subject}" LIMIT 1;`;
  // @ts-ignore
  let [[courseInfo]] = await connection.execute(fetchQuery);
  if (!courseInfo) {
    console.log("convertPrereqToCourse ERROR:", subject, courseNumber);
    return "???";
  }
  return courseInfo.subjectCourse;
}

// TODO optimize
// TODO Would like this to be postfix
// Course should be "ENGR103" etc
// Returns infix expression:
//     ENGR103<((ENGR102)&(MTH112Z<(MTH111Z<(MTH103<(MTH065)))))
async function populatePrereqs(course) {
  // Get representative Courses entry of course
  const [[courseInfo]] = await connection.execute(`
        SELECT * FROM Courses
        WHERE subjectCourse = "${course}"
        AND (scheduleTypeDescription = "Lecture"
            OR scheduleTypeDescription = "Online")
        LIMIT 1;`);
  if (!courseInfo) {
    console.log("populatePrereqs ERROR:", course);
    return "";
  }
  const prereqs = await getPrereqs(
    courseInfo.term,
    courseInfo.courseReferenceNumber
  );
  // Build infix expression
  let prereqString = course;
  if (!prereqs) {
    return prereqString;
  } else if (prereqs.length == 1) {
    // This hasn't happened in testing but I imagine it will for other subjects?
    return prereqString;
  }
  prereqString += "<(";
  for (let requirement of prereqs) {
    let requirementString = "";
    requirementString +=
      requirement.andOr === "And" ? "&" : requirement.andOr === "Or" ? "|" : "";
    requirementString += requirement.openParen;
    let course = await convertPrereqToCourse(
      requirement.subject,
      requirement.number
    );
    requirementString += course == "???" ? "?" : await populatePrereqs(course); // This is probably slow
    requirementString += requirement.closeParen;
    prereqString += requirementString;
  }

  // Remove extra ?s
  prereqString = prereqString.replace(/(\?)(\|(\?))+/g, "$1");
  // Remove (?)
  prereqString = prereqString.replace(/<\(\?\)/g, "");
  // Remove |?)
  prereqString = prereqString.replace(/\|\?\)/g, ")");
  // Remove (|?
  prereqString = prereqString.replace(/\(\?\|/g, "(");
  // Remove |?|
  prereqString = prereqString.replace(/\|\?\|/g, "|");
  prereqString += ")";
  return prereqString;
}

// ENGR103<((ENGR102)&(MTH112Z<(MTH111Z<(MTH103<(MTH065)))))
// Build SQL tables from string
// TODO finish
function buildTreeFromString(infixString) {
  const nodeQueue = [];
  const operatorStack = [];
  let substr = "";
  for (let c in infixString) {
    switch (c) {
      case "<":
        nodeQueue.push(substr);
        substr = "";
        break;
      case "(":
        operatorStack.push(c);
        break;
      case ")":
        // E
        break;
      case "&":
        operatorStack.push(c);
        break;
      default:
        substr += c;
    }
  }
}

async function main() {
  // No meaning in this table, only logic
  // "requires" node is because some classes require only a single other course
  //  and it didn't seem intuitive otherwise
  const createRequirementsTable = `
    CREATE TABLE IF NOT EXISTS Requirements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booleanType ENUM('and', 'or')
    );`;

  // Create prerequisite table if it doesn't exist
  const createPrerequisiteClosureTable = `
    CREATE TABLE IF NOT EXISTS Prerequisites (
        ancestor INT,
        descendant INT,
        FOREIGN KEY(ancestor) REFERENCES Requirements(id),
        FOREIGN KEY(descendant) REFERENCES Requirements(id)
    );`;

  const courseRequirementsTable = `
    CREATE TABLE IF NOT EXISTS CourseRequirements (
        subjectCourse VARCHAR(255) NOT NULL UNIQUE,
        requirementID INT NOT NULL UNIQUE,
        FOREIGN KEY(subjectCourse) references Courses(subjectCourse),
        FOREIGN KEY(requirementID) references Requirements(id)
    );
    `;

  await connection.execute(createRequirementsTable);
  await connection.execute(createPrerequisiteClosureTable);

  const title = "ENGR103";
  console.log(await populatePrereqs(title));
  await connection.end();
}

main().catch(console.error);
