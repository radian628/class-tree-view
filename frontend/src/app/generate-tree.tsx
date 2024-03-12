import { CourseRaw } from "../../../backend/load-courses.js";
import {
  PrereqTree,
  PrereqTreeCacheEntry,
} from "../../../backend/prereq-tree-cache.js";
import { api } from "../api/index.js";

function traverseTree(tree: PrereqTree, courses: Set<string>) {
  if (tree.type === "course") {
    courses.add(tree.subjectCourse);
    return;
  }
  tree.prereqs.map((p) => traverseTree(p, courses));
}

export async function grabAllPrereqs(courses: Set<string>) {
  const prereqs = new Map<string, PrereqTreeCacheEntry>();
  while (true) {
    let allPrereqsLoaded = true;

    const newCourses = await Promise.all(
      [...courses].map(async (subjectCourse) => {
        const newPrereqs = await api.prereq.query(subjectCourse);
        return [subjectCourse, newPrereqs] as const;
      })
    );

    courses = new Set<string>();

    for (const [k, v] of newCourses) {
      prereqs.set(k, v);
      if (v.type === "tree") traverseTree(v.tree, courses);
    }

    if (newCourses.length > 0) allPrereqsLoaded = false;

    if (allPrereqsLoaded) return prereqs;
  }
}
