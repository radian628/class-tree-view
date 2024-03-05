import fs from "node:fs/promises";
import { getDataForTerm } from "./get-classes.js";

import cachedSpring2024 from "../out/2024.json" with { type: "json" };
import { getHumanReadableSyntaxTree, getPrereqs, getPrereqsSyntaxTree } from "./get-prereqs.js";
import updateDB from "./updatedb";

let year = 2024;

// async delay
function delay(ms) {
  return new Promise((res, rej) => {
    setTimeout(res, ms);
  })
}

const classCount = rawClassList.length;
let loadedCount = 0;

// Function to run when the file doesn't exist
const myFunction = () => {
    console.log('File does not exist. Running a function...');
    // Your custom logic here
};

// Check if the file exists
fs.access(filePath)
    .then(() => {
        // File exists, so read its contents
        return fs.readFile(filePath, 'utf-8');
    })
    .catch((error) => {
        // File does not exist, run your function
        myFunction();

        // After running the function, read the file again
        return fs.readFile(filePath, 'utf-8');
    })
    .then((fileContent) => {
        // Parse the file content as JSON
        const jsonData = JSON.parse(fileContent);
        console.log('JSON data:', jsonData);
    })
    .catch((error) => {
        console.error('Error:', error);
    });

// get all the prereqs for spring 2024
fs.writeFile(`out/${year}_prereqs.json`, JSON.stringify(Object.fromEntries(

  await Promise.all(rawClassList.map(async c => {
    await delay(Math.random() * 30000);

    const prereqs = await getPrereqsSyntaxTree("202403", c.courseReferenceNumber);
  
    console.log(`${++loadedCount} / ${classCount} prereqs loaded`);

    return [c.courseReferenceNumber, prereqs]
  }))


)));
