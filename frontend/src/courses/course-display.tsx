import React from "react";
import { Course, RawCourseSection } from "./course-typedefs";
import "./course-display.less";

export function CourseTreeNodeDisplay(props: { course: Course }) {
  const c = props.course;

  return (
    <div className="course-tree-node-display">
      <h2>
        <span className="class-code">
          {c.subject} {c.courseNumber}
        </span>
        <span className="class-title">{c.courseTitle}</span>
      </h2>
      <div>
        <span className="label">Credits: </span>
        {c.creditHours}
      </div>
    </div>
  );
}
