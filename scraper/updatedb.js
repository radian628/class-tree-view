import { getDataForTerm } from "./get-classes.js";
import fs from "node:fs/promises";

let year = 2024;
let terms = [1,2,3,4];
let promises = {};

function updateDB(year, terms) {
    for (let term of terms) {
        let formattedTerm = year.toString() + (term < 10 ? `0${term}` : `${term}`);
        let promise = getDataForTerm(formattedTerm);
        promises[formattedTerm] = promise;
    }

    // Catch term data
    Promise.all(
      Object.entries(promises).map(([key, promise]) =>
        promise.then(data => ({ key, data }))
      )
    )
    .then(results => {
      console.log("All terms have been processed.");
      results.forEach(({ key, data }) => {
        fs.writeFile(`out/${key}.json`, JSON.stringify(data))
          .then(() => console.log(`${key}.json has been saved.`))
          .catch((error) => console.error(`Error writing ${key}.json:`, error));
      });
    })
    .catch(error => {
      console.error("An error occurred:", error);
    });
}

updateDB(year, terms);
