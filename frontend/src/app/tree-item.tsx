import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types";
import React from "react";

export function TreeItem(props: {
  node: FDGNode<string>;
  setNode: (setter: (oldNode: FDGNode<string>) => FDGNode<string>) => void;
}) {
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    // notify when mouse released by setting state and re-enable forces
    const mouseup = (e: MouseEvent) => {
      setIsMouseDown(false);
      props.setNode((node) => ({
        ...node,
        applyForces: true,
      }));
    };

    // move graphnode when mouse moved
    const mousemove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      props.setNode((node) => ({
        ...node,
        x: node.x + e.movementX,
        y: node.y + e.movementY,
      }));
    };

    // listener add/remove lifecycle stuff
    document.addEventListener("mouseup", mouseup);
    document.addEventListener("mousemove", mousemove);
    return () => {
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
  }, [isMouseDown]);

  return (
    <div
      className="tree-node"
      onMouseDown={() => {
        // register mouse down and disable forces on this node
        setIsMouseDown(true);
        props.setNode((node) => ({
          ...node,
          applyForces: false,
        }));
      }}
    >
      {props.node.data}
    </div>
  );
}
