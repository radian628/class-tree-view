import { RawCourse } from "./load-courses";

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
  prereqs: PrereqTree;
  course: RawCourse;
};
