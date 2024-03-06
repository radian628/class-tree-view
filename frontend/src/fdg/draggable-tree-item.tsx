import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types";
import React from "react";
import { FDGItemComponent } from "./fdg";
import { mapMapValues } from "../util/map";

export function DraggableTreeItem<T>(props: {
  node: FDGNode<T>;
  setNode: (setter: (oldNode: FDGNode<T>) => FDGNode<T>) => void;
  setGraph: (
    setGraph: (oldGraph: Map<string, FDGNode<T>>) => Map<string, FDGNode<T>>
  ) => void;
  scale: number;
  children: React.ReactElement | string;
}) {
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    // notify when mouse released by setting state and re-enable forces
    const mouseup = (e: MouseEvent) => {
      if (isMouseDown) {
        // enable forces in everything in the graph
        // (this will only recalc forces once
        // and then disable them for any node that doesn't need forces)
        props.setGraph((graph) =>
          mapMapValues(graph, (k, v) => ({ ...v, applyForces: true }))
        );

        setIsMouseDown(false);
      }
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
  });

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
