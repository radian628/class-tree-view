import { HTMLAttributes, useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types.js";
import React from "react";
import { FDGItemComponent } from "./fdg.js";
import { mapMapValues } from "../util/map.js";

export function DraggableTreeItem<T>(props: {
  node: FDGNode<T>;
  setNode: (setter: FDGNode<T>) => void;
  graphKey: string;
  draggingKey: string | undefined;
  setDraggingKey: (key: string | undefined) => void;
  setHoveringKey: (key: string | undefined) => void;
  scale: number;
  children:
    | (React.ReactElement | string | undefined)[]
    | React.ReactElement
    | string;
}) {
  const isMouseDown = props.draggingKey === props.graphKey;

  console.log("most up to date isMouseDown", isMouseDown);

  useEffect(() => {
    // notify when mouse released by setting state and re-enable forces
    const mouseup = (e: MouseEvent) => {
      props.setDraggingKey(undefined);
      if (isMouseDown)
        props.setNode({
          ...props.node,
          applyForces: true,
        });
    };

    // move graphnode when mouse moved
    const mousemove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const { node } = props;
      props.setNode({
        ...node,
        x: node.x + e.movementX / props.scale,
        y: node.y + e.movementY / props.scale,
      });
    };

    // listener add/remove lifecycle stuff
    document.addEventListener("mouseup", mouseup);
    document.addEventListener("mousemove", mousemove);
    return () => {
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
  });

  return (
    <div
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLElement) || !e.target.dataset.isDraggable)
          return;
        // register mouse down and disable forces on this node
        props.setDraggingKey(props.graphKey);
        props.setNode({
          ...props.node,
          applyForces: false,
        });
      }}
      onMouseEnter={(e) => {
        props.setHoveringKey(props.graphKey);
      }}
      onMouseLeave={(e) => {
        props.setHoveringKey(undefined);
      }}
    >
      {props.children}
    </div>
  );
}

export function Draggable<T>(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="draggable" {...props} data-is-draggable="true">
      {props.children}
    </div>
  );
}
