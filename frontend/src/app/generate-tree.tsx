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
  repulsionStrength: 0.001 * FORCES,
  mass: 1,
  applyForces: true,
};

const defaultConnectionSettings: (
  connections: number
) => FDGConnectionSettings = (connections) => ({
  directionality: "backwards",
  style: "solid",
  color: "black",
  targetDist: 200,
  attractStrength: (0.11 * FORCES) / connections ** 2,
  repelStrength: (0.5 * FORCES) / connections ** 2,
});

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
    return tree.subjectCourse === "???" || tree.subjectCourse.endsWith("H")
      ? undefined
      : tree;
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

export async function pruneRedundantClasses(
  tree: Map<string, PrereqTreeCacheEntry>
) {
  const classes = await Promise.all(
    [...tree.keys()].map((k) => api.getExactCourse.query(k))
  );

  const groupByTitle = new Map<string, CourseRaw>();

  for (const c of classes) {
    if (!c) continue;

    const entry = groupByTitle.get(c.courseNumber);

    if (!entry || entry.courseTitle.localeCompare(c.courseTitle) === -1) {
      groupByTitle.set(c.courseTitle, c);
    }
  }

  const groupBySubjectCourse = new Map<string, CourseRaw>();

  for (const [k, v] of groupByTitle) {
    groupBySubjectCourse.set(v.subjectCourse, v);
  }

  return groupBySubjectCourse;
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

export function getTreeInitials(tree: Map<string, PrereqTreeCacheEntry>) {
  const initials = new Map<string, PrereqTreeCacheEntry>();

  for (const [k, v] of tree) {
    if (
      // doesnt exist
      v.type === "dne" ||
      // AND/OR with zero entries
      (v.type === "tree" &&
        v.tree.type !== "course" &&
        v.tree.prereqs.length === 0)
    )
      initials.set(k, v);
  }

  return initials;
}

const MAG = 200;
const ANGLE_START = -(1 / 2) * Math.PI + 0.5;
const INIT_ANGLE_DELTA = (1 / 5) * Math.PI;

export function mergeOrsAndAnds(tree: PrereqTree): PrereqTree {
  if (tree.type === "or" || tree.type === "and") {
    return {
      ...tree,
      prereqs: tree.prereqs
        .map((p) => {
          if (p.type === tree.type) return p.prereqs;
          return [p];
        })
        .flat(),
    };
  }

  return tree;
}

export function dedupClassTree(
  tree: PrereqTree,
  dedupedClasses: Map<string, CourseRaw>
) {
  if (tree.type === "course") {
    if (!dedupedClasses.has(tree.subjectCourse)) return;
    return tree;
  }

  const filteredPrereqs = tree.prereqs
    .map((e) => dedupClassTree(e, dedupedClasses))
    .filter((p) => p) as PrereqTree[];

  if (filteredPrereqs.length === 0) return undefined;

  if (filteredPrereqs.length === 1) return filteredPrereqs[0];

  return {
    ...tree,
    prereqs: filteredPrereqs,
  };
}

export async function constructFDGStateFromPrereqTrees(
  prereqs: Map<string, PrereqTreeCacheEntry>
) {
  const dedupedClasses = await pruneRedundantClasses(prereqs);

  for (const k of [...prereqs.keys()]) {
    const prereq = prereqs.get(k)!;

    if (prereq.type !== "tree") continue;

    const dedupedTree = dedupClassTree(prereq.tree, dedupedClasses);

    if (dedupedTree) {
      prereqs.set(k, {
        ...prereq,
        tree: mergeOrsAndAnds(dedupedTree),
      });
    } else {
      prereqs.set(k, {
        ...prereq,
        type: "dne",
      });
    }
  }

  let id = 0;

  const treeData = new Map<string, FDGNode<TreeItem>>();
  treeData.delete("???");

  const existingNodes = new Map<string, string>();

  const addedToTree = new Set<string>();

  function nodeToKey(node: PrereqTree): string {
    if (node.type === "course") return node.subjectCourse;
    const key = `${node.type}-${node.prereqs.map(nodeToKey).join("-")}`;
    return key;
  }

  function traverseTree(
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
      return traverseCourse(
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

    const newConnections = tree.prereqs
      .map((e, i) =>
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
      .map(
        (p) =>
          [
            p,
            {
              ...defaultConnectionSettings(tree.prereqs.length),
            },
          ] as [string, FDGConnectionSettings]
      );

    if (bypassANDNode) {
      const parentCourseNode = treeData.get(parentCourse)!;
      for (const [k, v] of newConnections) {
        parentCourseNode.connections.set(k, v);
      }
      return parentCourse;
    } else {
      const nodekey = nodeToKey(tree);
      const existing = existingNodes.get(nodekey);

      if (existing) return existing;

      const newNode: FDGNode<TreeItem> = {
        data: {
          type: tree.type,
        },
        ...defaultFDGNodeSettings,
        x,
        y,
        yGravity: depth * -0.01,
        xGravity: breadth * 0.002,
        repulsionRadius: 100,
        connections: new Map(newConnections),
      };

      existingNodes.set(nodekey, myID);

      treeData.set(myID, newNode);
      return myID;
    }
  }

  function traverseCourse(
    subjectCourse: string,
    prevX: number,
    prevY: number,
    prevAngle: number,
    angleDelta: number,
    depth: number,
    breadth: number
  ) {
    if (addedToTree.has(subjectCourse) || !dedupedClasses.has(subjectCourse))
      return subjectCourse;
    addedToTree.add(subjectCourse);

    const angle = prevAngle;
    const x = prevX + Math.cos(angle) * MAG;
    const y = prevY + Math.sin(angle) * MAG;

    const cacheEntry = prereqs.get(subjectCourse);

    const connections = new Map<string, FDGConnectionSettings>();

    const existingNodes = new Map<string, string>();

    let mass = 1;
    if (initials.has(subjectCourse) || terminals.has(subjectCourse))
      mass = Infinity;

    treeData.set(subjectCourse, {
      data: {
        type: "course",
        course: dedupedClasses.get(subjectCourse)!,
      },
      ...defaultFDGNodeSettings,
      x,
      y,
      yGravity: depth * -0.01,
      xGravity: breadth * 0.002,
      connections,
      mass,
    });

    if (cacheEntry?.type === "tree") {
      const prereqs = traverseTree(
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
        ...defaultConnectionSettings(1),
      });
    }

    return subjectCourse;
  }

  const terminals = getTreeTerminals(prereqs);
  const initials = getTreeInitials(prereqs);

  [...terminals.entries()].map(async ([k, v], i) => {
    return traverseCourse(k, i * 900, 0, ANGLE_START, INIT_ANGLE_DELTA, 0, 0);
  });

  const initialsArr = [...initials.keys()];

  for (let i = 0; i < initialsArr.length; i++) {
    const subjectCourse = initialsArr[i];

    const node = treeData.get(subjectCourse);

    if (!node) continue;

    node.x = i * 900;
    node.y = -200 * treeData.size;
  }

  return treeData;
}
