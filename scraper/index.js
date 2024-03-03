import fs from "node:fs/promises";
import { getDataForTerm } from "./get-classes.js";

import cachedSpring2024 from "../out/2024.json" with { type: "json" };
import { getHumanReadableSyntaxTree, getPrereqs, getPrereqsSyntaxTree } from "./get-prereqs.js";
import updateDB from "./updatedb";

const cacheLocation = "../out/2024.json";

// async delay
function delay(ms) {
  return new Promise((res, rej) => {
    setTimeout(res, ms);
  })
}

const classCount = rawClassList.length;
let loadedCount = 0;
let year = 2024

// get all the prereqs for spring 2024
fs.writeFile(`out/${year}_prereqs.json`, JSON.stringify(Object.fromEntries(

  await Promise.all(rawClassList.map(async c => {
    await delay(Math.random() * 30000);

    const prereqs = await getPrereqsSyntaxTree("202403", c.courseReferenceNumber);
  
    console.log(`${++loadedCount} / ${classCount} prereqs loaded`);

    return [c.courseReferenceNumber, prereqs]
  }))


)));
