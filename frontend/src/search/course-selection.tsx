import React from "react";
import { CourseRaw } from "../../../backend/load-courses.js";
import { ClassSectionSearchResult } from "./class-search.js";
import { MajorSelector } from "../major-selector/major-selector.js";
import { api } from "../api/index.js";

export function CourseSelection(props: {
  courses: CourseRaw[];
  setCourses: (s: CourseRaw[]) => void;
}) {
  return (
    <div className="class-search">
      <div className="course-select-header">
        {/* <MajorSelector
          loadMajor={(m) => {
            console.log(m);

            const major = m as { requirements: string[][] }[];

            const courses: string[] = [];

            try {
              for (const reqs of major) {
                const flatReqs = reqs.requirements.flat(1) as string[];
                courses.push(...flatReqs);
              }
              (async () => {
                props.setCourses(
                  (
                    await Promise.all(
                      courses.map((c) => api.getExactCourse.query(c))
                    )
                  ).filter((e) => e) as CourseRaw[]
                );
              })();
            } catch {}
          }}
        ></MajorSelector> */}
      </div>
      <ul className="class-search-results">
        <li className="class-search-result-header">
          <div className="class-subject-course">Class</div>
          <div className="class-title">Title</div>
          <div className="class-last-offered">Last Offered</div>
        </li>
        {props.courses.map((r) => (
          <ClassSectionSearchResult
            addCourse={(c) => {
              const s = props.courses;
              props.setCourses(
                s.filter((c2) => c2.subjectCourse !== c.subjectCourse)
              );
            }}
            result={r}
            key={r.courseReferenceNumber + "-" + r.term}
          ></ClassSectionSearchResult>
        ))}
      </ul>
    </div>
  );
}
