function getCourseID(course: Course) {
  return `${course.subjectDesc} ${course.number}`;
}

export type PrereqTree =
  | {
      type: "class";
      // course IDs as returned by getCourseID
      id: string;
    }
  | {
      type: "operator";
      operator: "Or" | "And";
      operands: PrereqTree[];
    };

export type Course = {
  // e.g. MTH or CS
  subject: string;

  // e.g. "Mathematics" or "Computer Science"
  subjectDesc: string;

  // e.g. "444" or "162"
  number: string;

  prereqs?: PrereqTree;

  // title (e.g. "OPERATING SYSTEMS 2")
  title: string;
};
