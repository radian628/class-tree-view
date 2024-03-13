import { HTMLAttributes, useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types.js";
import React from "react";
import { FDGItemComponent } from "./fdg.js";

export function DraggableTreeItem<T>(props: {
  node: FDGNode<T>;
  setNode: (setter: (oldNode: FDGNode<T>) => FDGNode<T>) => void;
  scale: number;
  children:
    | (React.ReactElement | string | undefined)[]
    | React.ReactElement
    | string;
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
        x: node.x + e.movementX / props.scale,
        y: node.y + e.movementY / props.scale,
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
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLElement) || !e.target.dataset.isDraggable)
          return;
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

export function Draggable<T>(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="draggable" {...props} data-is-draggable="true"></div>;
}
