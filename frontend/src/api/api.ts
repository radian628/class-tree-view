import { createContext, useContext } from "react";
import { Course, RawCourseSection } from "../courses/course-typedefs";

export type APIResult<T> =
  | {
      type: "success";
      data: T;
    }
  | {
      type: "not-found";
    }
  | {
      type: "error";
      reason: string;
    };

export interface CoursesAPI {
  // given a term and a CRN, get data for a single section of a course
  getCourseSection(
    term: string,
    crn: string
  ): Promise<APIResult<RawCourseSection>>;

  // given a term, a subject, and a course number, get a list of CRNs for sections of a course
  getCourseCRNs(
    term: string,
    subject: string,
    number: string
  ): Promise<APIResult<string[]>>;

  // get all the data for a course
  getCourse(subject: string, number: string): Promise<APIResult<Course>>;

  getTerms(): Promise<APIResult<string[]>>;
}

const coursesAPIContext = createContext<CoursesAPI>({
  getCourseSection(term, crn) {
    throw new Error(
      "Trying to use courses API outside of a CourseAPIProvider!!!"
    );
  },
  getCourseCRNs(crn) {
    throw new Error(
      "Trying to use courses API outside of a CourseAPIProvider!!!"
    );
  },
  getCourse(subject, number) {
    throw new Error(
      "Trying to use courses API outside of a CourseAPIProvider!!!"
    );
  },
  getTerms() {
    throw new Error(
      "Trying to use courses API outside of a CourseAPIProvider!!!"
    );
  },
});

export function useCoursesAPI() {
  return useContext(coursesAPIContext);
}

const CourseAPIProvider = coursesAPIContext.Provider;
