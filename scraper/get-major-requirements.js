// TODO match 
import fs from "node:fs/promises";
import fetch from "node-fetch";
import cookies from "../.cookies.json" with { type: "json" };
import majors from "../requirements/majorCodes.json" with { type: "json" };

async function getBlockArray(major) {
    try {
        let cookieHeader = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ');
        const matchedMajor = majors.majors.find(item => item.description === major);

        const url = 'https://mydegrees.oregonstate.edu:7447/dashboard/api/audit';

        const requestBody = {
            catalogYear: "2324",
            classes: [],
            degree: "HBS",
            goals: [
                { catalogYear: "", code: "MAJOR", value: matchedMajor.key},
                // options field is filled manually. Only CS so far. Not all majors should have it
                { catalogYear: "", code: "CONC", value: matchedMajor.options[0] },
                { catalogYear: "", code: "COLLEGE", value: "16" } // College of Engineering
            ],
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
export async function parseRequirements() {
    const blocks = await getBlockArray();
    const parsedBlocks = [];

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
            if (!rule.requirement.courseArray) {
                console.log("skipped requirement in", block.title);
                return; // Skip rules without courseArray
            }

            const courses = rule.requirement.courseArray.map(course => course);
            const requirements = courses.map(course => course.discipline + course.number);
            newBlock.requirements.push(requirements);
        });

        parsedBlocks.push(newBlock);
    });

    return parsedBlocks;
}

// Call the function and handle the parsed requirements
parseRequirements("Computer Science").then(parsedRequirements => {
    console.log(JSON.stringify(parsedRequirements));
}).catch(error => {
    console.error("Error parsing requirements:", error);
});
