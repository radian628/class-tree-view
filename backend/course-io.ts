export const LATEST_COURSES_SQL_1 = `
SET @pat = CONCAT('%', ?, '%');
`;

export const LATEST_COURSES_SQL_2 = `
WITH cte AS
  (SELECT *, ROW_NUMBER() over (
      PARTITION BY subjectCourse
      ORDER BY term DESC
    ) AS rowNum
    FROM Courses
    WHERE 
      (
        subjectCourse LIKE @pat
        OR courseTitle LIKE @pat
        OR subjectDescription LIKE @pat
      )
    )
SELECT * FROM cte 
  WHERE rowNum = 1
  LIMIT ? OFFSET ?
`;

export const COURSE_SECTIONS_SQL = `
SELECT * FROM Courses
  WHERE subjectCourse = ?
  ORDER BY term DESC
  LIMIT ? OFFSET ?;
`;
