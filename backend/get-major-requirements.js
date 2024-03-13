// TODO match 
import fs from "node:fs/promises";
import fetch from "node-fetch";
const cookies = JSON.parse(await fs.readFile("./.cookies.json", { encoding: "utf-8" }));
const majors = JSON.parse(await fs.readFile("./requirements/majorCodes.json", { encoding: "utf-8" }));

let supported = ["Elect & Computer Engineering", "Computer Science", "Accountancy"];

export function getSupportedMajors() {
    return supported;
}

export async function getSupportedOptions(major) {
    const matchedMajor = majors.majors.find(item => item.description === major);
    console.log(major);
    console.log(matchedMajor);
    return matchedMajor.options;
}

async function getBlockArray(major, option) {
    try {
        let cookieHeader = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ');
        const matchedMajor = majors.majors.find(item => item.description === major);

        let goals = [
                { catalogYear: "", code: "MAJOR", value: matchedMajor.key},
                { catalogYear: "", code: "COLLEGE", value: "16" } // College of Engineering
        ];
        if (option) {
            goals.push(
                { catalogYear: "", code: "CONC", value: option }
            );
        }

        const url = 'https://mydegrees.oregonstate.edu:7447/dashboard/api/audit';

        const requestBody = {
            catalogYear: "2324",
            classes: [],
            degree: "HBS",
            goals: goals,
            school: "01", // Corvallis
            studentId: "934133183" // Hello!
        };

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'Accept': 'application/json',
                'Referer': 'https://mydegrees.oregonstate.edu:7447/dashboard/worksheets/whatif',
                'Content-Type': 'application/json',
                'Origin': 'https://mydegrees.oregonstate.edu:7447'
            },

        });
        const responseJson = await response.json();
        return responseJson.blockArray;
    } catch (error) {
        console.error('Error:', error);
    }
}
export async function getMajorRequirements(major, option) {
    const blocks = await getBlockArray(major, option);
    // console.log(JSON.stringify(blocks));
    const parsedBlocks = [];
    console.log(blocks);

    blocks.forEach((block) => {
        if (!block.ruleArray) {
            console.log(block.title, "seems to have no requirements");
            return;
        }

        const newBlock = {
            title: block.title,
            requirements: [],
        };

        block.ruleArray.forEach((rule) => {
            if (rule.ruleType = "Course") {
                if (rule.requirement.courseArray) {
                    // console.log(JSON.stringify(rule, null, 2));
                    const courses = rule.requirement.courseArray.map(course => course);
                    const requirements = courses.map(course => course.discipline + course.number);
                    newBlock.requirements.push(requirements);
                }
                else {
                    console.log("skipped requirement in", block.title, rule.label);
                }
            }
            // if (!rule.requirement.courseArray) {
            //     if (rule.ruleArray) {
            //         // Assumes OSU course is at idx length-1
            //         let courses = rule.ruleArray[rule.ruleArray.length-1].requirement;
            //         if (courses.courseArray) {
            //             courses = courses.courseArray.map(course => course);
            //         }
            //         else if (courses.ruleArray) {

            //         }
            //         //courses.map(course => course);
            //     }
            //     else {
            //         console.log("skipped requirement in", block.title);
            //         // console.log(JSON.stringify(rule, null, 2));
            //         // console.log(JSON.stringify(rule));
            //         return;
            //     }
            // }
            // else {
            //     const courses = rule.requirement.courseArray.map(course => course);
            //     const requirements = courses.map(course => course.discipline + course.number);
            //     newBlock.requirements.push(requirements);
            // }
        });

        parsedBlocks.push(newBlock);
    });

    return parsedBlocks;
}

// Call the function and handle the parsed requirements
getMajorRequirements(supported[1], Object.keys(getSupportedOptions(supported[1]))[0]).then(parsedRequirements => {
    console.log(JSON.stringify(parsedRequirements, null, 2));
    // JSON.stringify(obj, null, 2);
}).catch(error => {
    console.error("Error parsing requirements:", error);
});
