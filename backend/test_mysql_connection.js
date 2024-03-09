import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    // Relies on Docker?
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
        courseReferenceNumber INTEGER NOT NULL,
        courseNumber VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        courseTitle VARCHAR(255) NOT NULL,
        subjectCourse VARCHAR(255) NOT NULL,
        scheduleTypeDescription VARCHAR(255) NOT NULL,
        subjectDescription VARCHAR(255) NOT NULL,
        UNIQUE (courseReferenceNumber)
    )`;

    await connection.execute(createTableQuery);

    // TODO make this parameter
    const courseJSONCache = await readFile(path.join(__dirname, '../out/2024.json'), 'utf8');
    let courses = JSON.parse(courseJSONCache);

    const insertQuery = `
    INSERT IGNORE INTO Courses (term, courseReferenceNumber, courseNumber, subject, courseTitle, subjectCourse, scheduleTypeDescription, subjectDescription)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    for (const course of courses) {
        await connection.execute(insertQuery, [
            course.term,
            course.courseReferenceNumber,
            course.courseNumber,
            course.subject,
            course.courseTitle.replace(/&amp;/g, '&'),
            course.subjectCourse,
            course.scheduleTypeDescription,
            course.subjectDescription,
        ]);
    }

    console.log('Courses have been inserted successfully.');

    const testQuery = 'SELECT * FROM Courses LIMIT 5';
    const [rows] = await connection.execute(testQuery);
    console.log('Test Query Result:', rows);

    await connection.end();
}

main().catch(console.error);
