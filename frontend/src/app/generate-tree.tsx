import { CourseRaw } from "../../../backend/load-courses.js";
import {
  PrereqTree,
  PrereqTreeCacheEntry,
} from "../../../backend/prereq-tree-cache.js";
import { api } from "../api/index.js";
import { FDGConnectionSettings, FDGNode } from "../fdg/fdg-types.js";
import { TreeItem } from "./tree-item.js";

const defaultFDGNodeSettings = {
  repulsionRadius: 100,
  repulsionStrength: 0.025,
  mass: 1,
  applyForces: true,
};

const defaultConnectionSettings: FDGConnectionSettings = {
  directionality: "forwards",
  style: "solid",
  color: "black",
  targetDist: 250,
  attractStrength: 0.01,
  repelStrength: 0.1,
};

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
      if (v.type === "tree") {
        const prunedTreeData = clearEmptyEntriesFromTree(v.tree);
        if (!prunedTreeData) continue;

        const prunedTree: PrereqTreeCacheEntry = {
          ...v,
          tree: prunedTreeData,
        };
        traverseTree(prunedTreeData, courses);
        prereqs.set(k, prunedTree);
        continue;
      }

      prereqs.set(k, v);
    }

    if (newCourses.length > 0) allPrereqsLoaded = false;

    if (allPrereqsLoaded) return prereqs;
  }
}

export function clearEmptyEntriesFromTree(
  tree: PrereqTree
): PrereqTree | undefined {
  if (tree.type === "course") {
    return tree.subjectCourse === "???" ? undefined : tree;
  }

  const filteredPrereqs = tree.prereqs
    .map(clearEmptyEntriesFromTree)
    .filter((p) => p) as PrereqTree[];

  if (filteredPrereqs.length === 0) return undefined;

  if (filteredPrereqs.length === 1) return filteredPrereqs[0];

  return {
    ...tree,
    prereqs: filteredPrereqs,
  };
}

export function getTreeTerminals(tree: Map<string, PrereqTreeCacheEntry>) {
  const terminals = new Map(tree);

  function removeNonTerminals(tree: PrereqTree) {
    if (tree.type === "course") {
      terminals.delete(tree.subjectCourse);
      return;
    }

    tree.prereqs.map(removeNonTerminals);
  }

  for (const v of tree.values()) {
    if (v.type === "tree") removeNonTerminals(v.tree);
  }

  return terminals;
}

const MAG = 250;
const ANGLE_START = (4 / 3) * Math.PI;
const ANGLE_DELTA = (1 / 4) * Math.PI;

export async function constructFDGStateFromPrereqTrees(
  prereqs: Map<string, PrereqTreeCacheEntry>
) {
  let id = 0;

  const treeData = new Map<string, FDGNode<TreeItem>>();
  treeData.delete("???");

  const addedToTree = new Set<string>();

  async function traverseTree(
    tree: PrereqTree,
    prevX: number,
    prevY: number,
    prevAngle: number,
    parentCourse?: string
  ) {
    const angle = prevAngle;
    const x = prevX + Math.cos(angle) * MAG;
    const y = prevY + Math.sin(angle) * MAG;

    if (tree.type === "course") {
      // const cacheEntry = prereqs.get(tree.subjectCourse);
      // if (
      //   cacheEntry &&
      //   cacheEntry.type === "tree" &&
      //   !addedToTree.has(tree.subjectCourse)
      // ) {
      //   addedToTree.add(tree.subjectCourse);
      //   await traverseTree(cacheEntry.tree, x, y, 0);
      // }
      return await traverseCourse(tree.subjectCourse, x, y, angle);
    }

    const myID = (++id).toString();

    const newConnections = await Promise.all(
      tree.prereqs.map((e, i) =>
        traverseTree(
          e,
          x,
          y,
          angle + ANGLE_DELTA * i - (tree.prereqs.length / 2) * ANGLE_DELTA
        )
      )
    ).then((prereqs) =>
      prereqs.map(
        (p) =>
          [
            p,
            {
              ...defaultConnectionSettings,
            },
          ] as [string, FDGConnectionSettings]
      )
    );

    console.log(tree.type, parentCourse);

    if (tree.type === "and" && parentCourse && treeData.has(parentCourse)) {
      console.log(parentCourse, tree);
      const parentCourseNode = treeData.get(parentCourse)!;
      for (const [k, v] of newConnections) {
        parentCourseNode.connections.set(k, v);
      }
      return parentCourse;
    } else {
      treeData.set(myID, {
        data: {
          type: tree.type,
        },
        ...defaultFDGNodeSettings,
        x,
        y,
        connections: new Map(newConnections),
      });
      return myID;
    }
  }

  async function traverseCourse(
    subjectCourse: string,
    prevX: number,
    prevY: number,
    prevAngle: number
  ) {
    const angle = ANGLE_START;
    const x = prevX + Math.cos(angle) * MAG;
    const y = prevY + Math.sin(angle) * MAG;

    const cacheEntry = prereqs.get(subjectCourse);

    const connections = new Map<string, FDGConnectionSettings>();

    treeData.set(subjectCourse, {
      data: {
        type: "course",
        course: await api.getExactCourse.query(subjectCourse),
      },
      ...defaultFDGNodeSettings,
      x,
      y,
      connections,
    });

    if (cacheEntry?.type === "tree") {
      const prereqs = await traverseTree(
        cacheEntry.tree,
        x,
        y,
        prevAngle,
        subjectCourse
      );
      connections.set(prereqs, defaultConnectionSettings);
    }

    return subjectCourse;
  }

  const terminals = getTreeTerminals(prereqs);

  await Promise.all(
    [...terminals.entries()].map(async ([k, v], i) => {
      // if (v.type === "tree") {
      //   const clearedTree = clearEmptyEntriesFromTree(v.tree);
      //   if (!clearedTree) return;
      // }
      await traverseCourse(k, i * MAG, 0, 0);
    })
  );

  return treeData;
}
