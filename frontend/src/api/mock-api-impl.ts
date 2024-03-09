import COURSES_SPRING2024 from "../../../scraper/cached_spring2024.json";
import PREREQS_SPRING2024 from "../../../out/spring_2024_prereqs.json";
import {
  Course,
  PrereqRequirementTree,
  RawCourseSection,
  RawPrereqTree,
} from "../courses/course-typedefs";
import { CoursesAPI } from "./api";

// @ts-ignore
const courseSectionList: RawCourseSection[] = COURSES_SPRING2024.map(
  (e) => e.data
).flat(1);

// key = subject + number (e.g. MTH251, CS444, SUS102, etc)
const courseMap = new Map<string, Course>();
const crnMap = new Map<string, RawCourseSection>();
for (const c of courseSectionList) {
  crnMap.set(c.courseReferenceNumber, c);
  courseMap.set(c.subject + c.courseNumber, { ...c, prereqID: 0 });
}

const prereqTrees = new Map<number, RawPrereqTree>();

const crn2IDMap = new Map<string, number>();

let prereqTreeIndex = 0;

for (const [crn, p] of Object.entries(
  PREREQS_SPRING2024 as Record<string, RawPrereqTree>
)) {
  const myID = prereqTreeIndex++;
  crn2IDMap.set(crn, myID);
  const courseSection = crnMap.get(crn)!;
  const subjectAndNumber = courseSection.subject + courseSection.courseNumber;
  courseMap.get(subjectAndNumber)!.prereqID = myID;
  prereqTrees.set(myID, p);
}

export const MockAPI: CoursesAPI = {
  async getCourseSection(term, crn) {
    const section = courseSectionList.find(
      (c) => c.courseReferenceNumber === crn && c.term === term
    );

    if (section) return { type: "success", data: section };

    return { type: "not-found" };
  },

  async getCourseCRNs(term, subject, number) {
    return {
      type: "success",
      data: courseSectionList
        .filter(
          (c) =>
            c.term === term &&
            c.subject === subject &&
            c.courseNumber === number
        )
        .map((c) => c.courseReferenceNumber),
    };
  },

  async getCourse(subject, number) {
    const course = courseMap.get(subject + number);

    if (course)
      return {
        type: "success",
        data: course,
      };

    return { type: "not-found" };
  },

  async getTerms() {
    return { type: "success", data: ["202403"] };
  },

  async getPrerequisiteTree(id: number) {
    const tree = prereqTrees.get(id);

    if (!tree) return { type: "not-found" };

    function parseRawPrereqTree(tree: RawPrereqTree) {}
  },
};
