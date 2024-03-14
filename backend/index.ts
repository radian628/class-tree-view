import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createAPI } from "./api.js";

import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { PrereqTreeCache } from "./prereq-tree-cache.js";
import { TermsCache } from "./terms-cache.js";
import { CourseCache } from "./course-cache.js";

import https from 'https';
import fs from 'fs';

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
        term VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        courseReferenceNumber VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        courseNumber VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        subject VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        courseTitle VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        subjectCourse VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        scheduleTypeDescription VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        subjectDescription VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
        PRIMARY KEY (term, courseReferenceNumber)
    );`;

  // remove this
  console.log("Removing old courses table (REMOVE THIS FOR PROD)");
  await connection.execute("DROP TABLE IF EXISTS Courses;");

  console.log("Creating courses table...");
  await connection.execute(createTableQuery);

  const courseJSONCache = await readFile(
    path.join(__dirname, "../scraper/cached_spring2024.json"),
    "utf8"
  );
  const courses: any = JSON.parse(courseJSONCache)
    .map((e: any) => e.data)
    .flat(1);

  // const insertQuery = `
  //   INSERT INTO
  //     Courses (term, courseReferenceNumber, courseNumber, subject, courseTitle, subjectCourse, scheduleTypeDescription, subjectDescription)
  //   VALUES ?;`;

  // await connection.query(insertQuery, [
  //   courses.map((course: any) => [
  //     course.term,
  //     course.courseReferenceNumber,
  //     course.courseNumber,
  //     course.subject,
  //     course.courseTitle.replace(/&amp;/g, "&"),
  //     course.subjectCourse,
  //     course.scheduleTypeDescription,
  //     course.subjectDescription,
  //   ]),
  // ]);

  console.log("Courses have been inserted successfully.");

  const testQuery = "SELECT * FROM Courses LIMIT 5";
  const [rows] = await connection.execute(testQuery);
  console.log("Test Query Result:", rows);

  const prereqTreeCache = new PrereqTreeCache(connection);
  const termsCache = new TermsCache();
  const courseCache = new CourseCache(connection, termsCache);

  // create express server
  const app = express();

  app.get("/", (req, res) => {
    res.redirect("/static");
  });

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

  if (process.env.IS_PROD === "true") {
      if (typeof process.env.CERT_PATH === 'undefined') {
          throw new Error('CERT_PATH environment variable is not set.');
      }
      const privateKey = fs.readFileSync(path.join(process.env.CERT_PATH, "privkey.pem"), "utf8");
      const certificate = fs.readFileSync(path.join(process.env.CERT_PATH, "fullchain.pem"), "utf8");

      const credentials = { key: privateKey, cert: certificate };

      const httpsServer = https.createServer(credentials, app);

      httpsServer.listen(443, () => {
          console.log('HTTPS server running on port 443');
      });
      // redirect HTTP server
      const httpApp = express();
      httpApp.all('*', (req, res) => res.redirect(300, req.hostname));
          // const httpServer = http.createServer(httpApp);
      httpApp.listen(80, () => console.log(`HTTP redirect server listening`));

  } else {
          app.listen(8000, () => {
              console.log('HTTP server running on port 80');
          });
      }

}

main().catch(console.error);
