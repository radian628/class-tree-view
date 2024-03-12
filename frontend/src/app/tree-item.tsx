import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types.js";
import React from "react";
import { DraggableTreeItem } from "../fdg/draggable-tree-item.js";
import { CourseRaw } from "../../../backend/load-courses.js";
import "./tree-item.less";

export type TreeItem =
  | {
      type: "and" | "or";
    }
  | {
      type: "course";
      course: CourseRaw | undefined;
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

export function TreeItemView(props: {
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

        if (data.type.toLowerCase() === "and") {
          return <div className="tree-item-and-or">And</div>;
        }

        if (data.type.toLowerCase() === "or") {
          return <div className="tree-item-and-or">Or</div>;
        }

        if (data.type === "course") {
          if (!data.course)
            return <div className="tree-item"> Course data not found.</div>;

          return <div className="tree-item">{data.course.courseTitle}</div>;
        }

        return <></>;
      })()}
    </DraggableTreeItem>
  );
}
