import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types.js";
import React from "react";
import { DraggableTreeItem } from "../fdg/draggable-tree-item.js";
import { CourseRaw } from "../../../backend/load-courses.js";

export type TreeItem =
  | {
      type: "and" | "or";
    }
  | {
      type: "course";
      course: CourseRaw;
    };

// export function TreeItem(props: {
//   node: FDGNode<string>;
//   setNode: (setter: (oldNode: FDGNode<string>) => FDGNode<string>) => void;
//   scale: number;
// }) {
//   return (
//     <DraggableTreeItem
//       node={props.node}
//       setNode={props.setNode}
//       scale={props.scale}
//     >
//       <div className="tree-item">{props.node.data}</div>
//     </DraggableTreeItem>
//   );
// }

export function TreeItem(props: {
  node: FDGNode<TreeItem>;
  setNode: (setter: (oldNode: FDGNode<TreeItem>) => FDGNode<TreeItem>) => void;
  scale: number;
}) {
  const nodeData = props.node.data;
  return (
    <DraggableTreeItem
      node={props.node}
      setNode={props.setNode}
      scale={props.scale}
    >
      {(() => {
        const data = nodeData;

        if (data.type === "and") {
          return <div className="tree-item-and-or">And</div>;
        }

        if (data.type === "or") {
          return <div className="tree-item-and-or">Or</div>;
        }

        if (data.type === "course") {
          return <div>{data.course.courseTitle}</div>;
        }

        return <></>;
      })()}
    </DraggableTreeItem>
  );
}
