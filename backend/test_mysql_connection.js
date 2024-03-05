import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Create courses table if it doesn't exist
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS Courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        term VARCHAR(255) NOT NULL,
        courseReferenceNumber VARCHAR(255) NOT NULL,
        courseNumber VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        courseTitle VARCHAR(255) NOT NULL
    )`;
    //
    // Create closure table for prereq trees
    // Each entry lists all ancestors
    // Will we want descendants listed as well?
        // Could make it easier to be like "oh, cool, I just unlocked this class"
    // ALso, performance is faster with ints and stuff that fits in cache (<32B)
    const createClosureTable = `
    CREATE TABLE IF NOT EXISTS Courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        courseTitle VARCHAR(255) NOT NULL,
        prerequisite VARCHAR(255) NOT NULL
    )`;


    await connection.execute(createTableQuery);

    const courseJSONCache = await readFile(path.join(__dirname, '../out/2024.json'), 'utf8');
    const courses = JSON.parse(courseJSONCache);

    const insertQuery = `
    INSERT INTO Courses (term, courseReferenceNumber, courseNumber, subject, courseTitle)
    VALUES (?, ?, ?, ?, ?)`;

    for (const course of courses) {
        await connection.execute(insertQuery, [
            course.term,
            course.courseReferenceNumber,
            course.courseNumber,
            course.subject,
            course.courseTitle.replace(/&amp;/g, '&')
        ]);
    }

    console.log('Courses have been inserted successfully.');

    const testQuery = 'SELECT * FROM Courses LIMIT 5';
    const [rows] = await connection.execute(testQuery);
    console.log('Test Query Result:', rows);

    await connection.end();
}

main().catch(console.error);
