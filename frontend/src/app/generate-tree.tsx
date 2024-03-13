import { CourseRaw } from "../../../backend/load-courses.js";
import {
  PrereqTree,
  PrereqTreeCacheEntry,
} from "../../../backend/prereq-tree-cache.js";
import { api } from "../api/index.js";
import { FDGConnectionSettings, FDGNode } from "../fdg/fdg-types.js";
import { TreeItem } from "./tree-item.js";

const FORCES = 1;

const defaultFDGNodeSettings = {
  repulsionRadius: 200,
  repulsionStrength: 0.01 * FORCES,
  mass: 1,
  applyForces: true,
};

const defaultConnectionSettings: FDGConnectionSettings = {
  directionality: "forwards",
  style: "solid",
  color: "black",
  targetDist: 300,
  attractStrength: 0.03 * FORCES,
  repelStrength: 0.5 * FORCES,
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

const MAG = 200;
const ANGLE_START = (4 / 3) * Math.PI;
const INIT_ANGLE_DELTA = (1 / 5) * Math.PI;

export async function constructFDGStateFromPrereqTrees(
  prereqs: Map<string, PrereqTreeCacheEntry>
) {
  console.log("prereqs!...", prereqs);

  let id = 0;

  const treeData = new Map<string, FDGNode<TreeItem>>();
  treeData.delete("???");

  const addedToTree = new Set<string>();

  async function traverseTree(
    tree: PrereqTree,
    prevX: number,
    prevY: number,
    prevAngle: number,
    angleDelta: number,
    depth: number,
    breadth: number,
    parentCourse?: string
  ) {
    // next position
    const angle = prevAngle;
    const x = prevX + Math.cos(angle) * MAG;
    const y = prevY + Math.sin(angle) * MAG;

    // handle course with dedicated function
    if (tree.type === "course") {
      return await traverseCourse(
        tree.subjectCourse,
        x,
        y,
        angle,
        angleDelta * 1,
        depth + 1,
        breadth
      );
    }

    const myID = (++id).toString();

    const bypassANDNode =
      tree.type === "and" && parentCourse && treeData.has(parentCourse);

    const newConnections = await Promise.all(
      tree.prereqs.map((e, i) =>
        traverseTree(
          e,
          x,
          y,
          angle + angleDelta * i - ((tree.prereqs.length - 1) / 2) * angleDelta,
          angleDelta * 1,
          depth + 1,
          breadth + (i - (tree.prereqs.length - 1) / 2)
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

    if (bypassANDNode) {
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
        yGravity: depth * -0.01,
        xGravity: breadth * 0.002,
        repulsionRadius: 50,
        connections: new Map(newConnections),
      });
      return myID;
    }
  }

  async function traverseCourse(
    subjectCourse: string,
    prevX: number,
    prevY: number,
    prevAngle: number,
    angleDelta: number,
    depth: number,
    breadth: number
  ) {
    if (addedToTree.has(subjectCourse)) return subjectCourse;
    addedToTree.add(subjectCourse);

    const angle = prevAngle;
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
      yGravity: depth * -0.01,
      xGravity: breadth * 0.002,
      connections,
    });

    if (cacheEntry?.type === "tree") {
      const prereqs = await traverseTree(
        cacheEntry.tree,
        x,
        y,
        prevAngle,
        angleDelta * 1,
        depth + 1,
        breadth,
        subjectCourse
      );
      connections.set(prereqs, {
        ...defaultConnectionSettings,
      });
    }

    return subjectCourse;
  }

  const terminals = getTreeTerminals(prereqs);

  await Promise.all(
    [...terminals.entries()].map(async ([k, v], i) => {
      await traverseCourse(k, i * MAG, 0, 0, INIT_ANGLE_DELTA, 0, 0);
    })
  );

  console.log(treeData);

  return treeData;
}
