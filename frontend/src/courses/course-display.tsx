import React from "react";
import { RawCourseSection } from "./course-typedefs.js";

export function CourseTreeNodeDisplay(props: { course: RawCourseSection }) {
  return (
    <div className="course-tree-node-display">
      <h2>{props.course.courseTitle}</h2>
      <p></p>
    </div>
  );
}
