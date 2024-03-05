import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types";
import React from "react";
import { FDGItemComponent } from "./fdg";

export function DraggableTreeItem<T>(props: {
  node: FDGNode<T>;
  setNode: (setter: (oldNode: FDGNode<T>) => FDGNode<T>) => void;
  children: React.ReactElement | string;
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
      onMouseDown={() => {
        // register mouse down and disable forces on this node
        setIsMouseDown(true);
        props.setNode((node) => ({
          ...node,
          applyForces: false,
        }));
      }}
    >
      {props.children}
    </div>
  );
}
