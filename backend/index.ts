import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createAPI } from "./api.js";

import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { PrereqTreeCache } from "./prereq-tree-cache.js";
import { TermsCache } from "./terms-cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Starting backend!");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Create courses table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS Courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        term VARCHAR(255) NOT NULL,
        courseReferenceNumber VARCHAR(255) NOT NULL,
        courseNumber VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        courseTitle VARCHAR(255) NOT NULL,
        subjectCourse VARCHAR(255) NOT NULL,
        scheduleTypeDescription VARCHAR(255) NOT NULL,
        subjectDescription VARCHAR(255) NOT NULL
    );`;

  // remove this
  console.log("Removing old courses table (REMOVE THIS FOR PROD)");
  await connection.execute("DROP TABLE Courses;");

  console.log("Creating courses table...");
  await connection.execute(createTableQuery);

  const courseJSONCache = await readFile(
    path.join(__dirname, "../scraper/cached_spring2024.json"),
    "utf8"
  );
  const courses: any = JSON.parse(courseJSONCache)
    .map((e) => e.data)
    .flat(1);

  const insertQuery = `
    INSERT INTO 
      Courses (term, courseReferenceNumber, courseNumber, subject, courseTitle, subjectCourse, scheduleTypeDescription, subjectDescription)
    VALUES ?;`;

  await connection.query(insertQuery, [
    courses.map((course: any) => [
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

  console.log("Courses have been inserted successfully.");

  const testQuery = "SELECT * FROM Courses LIMIT 5";
  const [rows] = await connection.execute(testQuery);
  console.log("Test Query Result:", rows);

  const prereqTreeCache = new PrereqTreeCache(connection);
  const termsCache = new TermsCache();

  // create express server
  const app = express();

  // static hosting
  app.use("/static", express.static("./frontend/build"));

  // api
  app.use(
    "/api",
    trpcExpress.createExpressMiddleware({
      router: createAPI(connection, {
        prereqTreeCache,
        termsCache,
      }),
    })
  );

  // listen on port 8000
  app.listen(8000);

  console.log("Server is listening on port 8000!");
}

main().catch(console.error);
