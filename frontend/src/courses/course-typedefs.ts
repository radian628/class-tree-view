import COURSES_SPRING2024 from "../../../scraper/cached_spring2024.json";
import PREREQS_SPRING2024 from "../../../out/spring_2024_prereqs.json";

export type RawFaculty = {
  bannerId: string;
  category: null;
  class: string;
  courseReferenceNumber: string; // crn of the section the prof is teaching?
  displayName: string;
  emailAddress: string;
  primaryIndicator: boolean;
  term: string;
};

export type RawMeetingsFaculty = {
  category: string;
  class: string;
  courseReferenceNumber: string;
  meetingTime: {
    beginTime: string; // e.g. "1400" for what I assume is 2pm
    building: string; // building abbrevation (e.g. "STAG")
    buildingDescription: string; // e.g. "Strand Agricultural Hall",
    campus: string; // e.g. "C" for "Corvallis"
    campusDescription: string; // e.g. "Oregon State - Corvallis"
    category: string;
    class: string;
    courseReferenceNumber: string;
    creditHourSession: number;

    startDate: string; // why are they storing dates as strings???
    endDate: string;

    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;

    hoursWeek: number;
    meetingScheduleType: string;
    meetingType: string;
    meetingTypeDescription: string;
    room: string;
    term: string;
  };
  term: string;
};

// note: courseNumber and subjectDescription match the prereq info
export type RawCourseSection = {
  id: number; // numerical ID (NOT CRN)
  term: string; // e.g. "202403"
  termDesc: string; // e..g "Spring 2024"
  courseReferenceNumber: string;
  partOfTerm: string; // not sure? e.g. 1
  courseNumber: string; // e.g. "251"
  subject: string; // e.g. "MTH"
  subjectDescription: string; // e.g. "Mathematics"
  scheduleTypeDescription: string; // e.g. "Lecture"
  courseTitle: string; // e.g. "DIFFERENTIAL CALCULUS"
  creditHours: number;

  maximumEnrollment: number;
  enrollment: number;
  seatsAvailable: number;
  waitCapacity: number;
  waitCount: number;
  waitAvailable: number;

  // TODO: figure out how these work
  crossList: string | null;
  crossListCapacity: number | null;
  crossListCount: number | null;
  crossListAvailable: number | null;

  // TODO: figure out how these work
  creditHourHigh: number | null;
  creditHourLow: number;
  creditHourIndicator: "OR";

  openSection: boolean;
  linkIdentifier: null; // prob not just null

  subjectCourse: string; // e.g. MTH251

  faculty: RawFaculty[];

  meetingsFaculty: RawMeetingsFaculty[];

  reservedSeatSummary: null;
  sectionAttributes: unknown[];
  instructionalMethod: string;
  instructionalMethodDescription: string; // e.g. "In-person Section"
};

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
  course: RawCourseSection;
};
