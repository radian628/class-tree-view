import React from "react";
import { CourseRaw } from "../../../backend/load-courses.js";
import { ClassSectionSearchResult } from "./class-search.js";

export function CourseSelection(props: {
  courses: CourseRaw[];
  setCourses: (s: CourseRaw[]) => void;
}) {
  return (
    <div className="class-search">
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
