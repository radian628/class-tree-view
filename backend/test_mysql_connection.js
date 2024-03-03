import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';  // Import the path module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Ensure the table exists
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS Courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        term VARCHAR(255) NOT NULL,
        courseReferenceNumber VARCHAR(255) NOT NULL,
        courseNumber VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        courseTitle VARCHAR(255) NOT NULL
    )`;

    await connection.execute(createTableQuery);

    // Read and parse the JSON file
    const jsonData = await readFile(path.join(__dirname, '../out/2024.json'), 'utf8');
    const courses = JSON.parse(jsonData);

    // Prepare the insert query
    const insertQuery = `
    INSERT INTO Courses (term, courseReferenceNumber, courseNumber, subject, courseTitle)
    VALUES (?, ?, ?, ?, ?)`;

    // Iterate over each course and insert the relevant data into the database
    for (const course of courses) {
        await connection.execute(insertQuery, [
            course.term,
            course.courseReferenceNumber,
            course.courseNumber,
            course.subject,
            course.courseTitle.replace(/&amp;/g, '&') // Decoding HTML entities
        ]);
    }

    console.log('Courses have been inserted successfully.');

    await connection.end();
}

main().catch(console.error);

