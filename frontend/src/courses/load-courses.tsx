import COURSES_SPRING2024 from "../../../scraper/cached_spring2024.json";
import PREREQS_SPRING2024 from "../../../out/spring_2024_prereqs.json";

// note: courseNumber and subjectDescription match the prereq info
export type RawCourse = {
  id: string;
  term: string;
  termDesc: string;
  courseReferenceNumber: string;
  courseNumber: string;
  subject: string;
  subjectDescription: string;
  courseTitle: string;
};

export type RawCourses = {
  data: RawCourse[];
}[];

export type RawPrereqTree =
  | {
      type: "class";
      class: {
        test: string;
        score: string;
        subject: string;
        number: string;
        level: string;
        gradeReq: string;
      };
    }
  | {
      type: "operator";
      operator: "And" | "Or";
      operands: RawPrereqTree[];
    };

export type RawPrereqs = {
  [crn: string]: RawPrereqTree;
};

export function loadTermCoursesAndPrereqs(
  rawCourses: RawCourses,
  prereqs: RawPrereqs
) {
  const rawCourseList = rawCourses.map((c) => c.data).flat(1);

  const mapByCRN = new Map(
    rawCourseList.map((c) => {
      return [c.courseReferenceNumber, c];
    })
  );
}
