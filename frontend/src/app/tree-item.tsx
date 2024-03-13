import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types.js";
import React from "react";
import { Draggable, DraggableTreeItem } from "../fdg/draggable-tree-item.js";
import { CourseRaw } from "../../../backend/load-courses.js";
import "./tree-item.less";
import { GraphState } from "./app.js";
import { produce } from "immer";

export type TreeItem =
  | {
      type: "and" | "or";
    }
  | {
      type: "course";
      course: CourseRaw | undefined;
    };

export enum Satisfaction {
  Taken,
  AvailableClass,
  AvailableAndOr,
  NotDone,
}

// Satisfaction of AND/OR nodes and taken classes can propagate.
function canPropagateSatisfaction(s: Satisfaction) {
  return s === Satisfaction.AvailableAndOr || s === Satisfaction.Taken;
}

export function isRequirementSatisfied(
  node: FDGNode<TreeItem> | undefined,
  key: string,
  graph: Map<string, FDGNode<TreeItem>>,
  taken: Set<string>,
  visited = new Map<string, Satisfaction>()
): Satisfaction {
  if (visited.has(key)) return visited.get(key)!;

  if (!node) {
    return Satisfaction.NotDone;
    visited.set(key, Satisfaction.NotDone);
  }

  let ret = Satisfaction.NotDone;

  // class already taken
  if (taken.has(key)) {
    ret = Satisfaction.Taken;
  } else if (node.connections.size > 0) {
    const connections = [...node.connections].filter(([k]) => k !== key);

    // OR
    if (node.data.type === "or") {
      ret = connections.some(([to]) =>
        canPropagateSatisfaction(
          isRequirementSatisfied(graph.get(to), to, graph, taken)
        )
      )
        ? Satisfaction.AvailableAndOr
        : Satisfaction.NotDone;

      // AND
    } else {
      ret = connections.every(([to]) =>
        canPropagateSatisfaction(
          isRequirementSatisfied(graph.get(to), to, graph, taken)
        )
      )
        ? node.data.type === "course"
          ? Satisfaction.AvailableClass
          : Satisfaction.AvailableAndOr
        : Satisfaction.NotDone;
    }
  }

  visited.set(key, ret);

  return ret;
}

export const TreeItemView = function (props: {
  graphKey: string;
  node: FDGNode<TreeItem>;
  setNode: (setter: (oldNode: FDGNode<TreeItem>) => FDGNode<TreeItem>) => void;
  scale: number;
  graph: Map<string, FDGNode<TreeItem>>;
  setGraph: (
    setter: (
      old: Map<string, FDGNode<TreeItem>>
    ) => Map<string, FDGNode<TreeItem>>
  ) => void;
  state: GraphState;
  setState: React.Dispatch<React.SetStateAction<GraphState>>;
}) {
  const nodeData = props.node.data;

  const isCourse = props.node.data.type === "course";

  const subjectCourse =
    props.node.data.type === "course"
      ? props.node.data.course?.subjectCourse ?? ""
      : "";

  const satisfaction = isRequirementSatisfied(
    props.node,
    props.graphKey,
    props.graph,
    props.state.taken
  );

  return (
    <DraggableTreeItem
      node={props.node}
      setNode={props.setNode}
      scale={props.scale}
    >
      <div
        className={
          {
            [Satisfaction.Taken]: "taken-course ",
            [Satisfaction.AvailableAndOr]: "taken-course ",
            [Satisfaction.AvailableClass]: "available-course ",
            [Satisfaction.NotDone]: "not-taken-course ",
          }[satisfaction] +
          (isCourse ? "tree-item-course " : "tree-item-and-or ") +
          "tree-item"
        }
      >
        {isCourse ? (
          <Draggable className="tree-item-header"></Draggable>
        ) : undefined}
        <div
          className="tree-item-content"
          onClick={(e) => {
            if (!isCourse) return;

            props.setState(
              produce(props.state, (state) => {
                if (state.taken.has(subjectCourse)) {
                  state.taken.delete(subjectCourse);
                } else {
                  state.taken.add(subjectCourse);
                }
              })
            );
          }}
        >
          {(() => {
            const data = nodeData;

            if (data.type.toLowerCase() === "and") {
              return <Draggable>And</Draggable>;
            }

            if (data.type.toLowerCase() === "or") {
              return <Draggable>Or</Draggable>;
            }

            if (data.type === "course") {
              if (!data.course) return <div> Course data not found.</div>;

              return <div>{data.course.courseTitle}</div>;
            }

            return <></>;
          })()}
        </div>
      </div>
    </DraggableTreeItem>
  );
};
