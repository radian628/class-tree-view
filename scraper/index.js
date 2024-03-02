import fs from "node:fs/promises";
import { getDataForTerm } from "./get-classes.js";

import cachedSpring2024 from "./cached_spring2024.json" with { type: "json" };
import { getHumanReadableSyntaxTree, getPrereqs, getPrereqsSyntaxTree } from "./get-prereqs.js";

const rawClassList = (await getDataForTerm("202403")).map((s) => s.data).flat(1);

// const rawClassNamesTxt = rawClassList.map(c => c.courseTitle).join("\n");

// fs.writeFile("out/class_names_spring2024.txt", rawClassNamesTxt);

// const tree = await getPrereqsSyntaxTree("202402", "30067");

// console.log(getHumanReadableSyntaxTree(tree));

// fs.writeFile("out/prereq_tree.json", JSON.stringify(tree));

// async delay
function delay(ms) {
  return new Promise((res, rej) => {
    setTimeout(res, ms);
  })
}

const classCount = rawClassList.length;
let loadedCount = 0;

// get all the prereqs for spring 2024
fs.writeFile("out/spring_2024_prereqs.json", JSON.stringify(Object.fromEntries(

  await Promise.all(rawClassList.map(async c => {
    await delay(Math.random() * 30000);

    const prereqs = await getPrereqsSyntaxTree("202403", c.courseReferenceNumber);
  
    console.log(`${++loadedCount} / ${classCount} prereqs loaded`);

    return [c.courseReferenceNumber, prereqs]
  }))


)));