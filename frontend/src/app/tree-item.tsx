import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types";
import React from "react";
import { DraggableTreeItem } from "../fdg/draggable-tree-item";

export function TreeItem(props: {
  node: FDGNode<string>;
  setNode: (setter: (oldNode: FDGNode<string>) => FDGNode<string>) => void;
  scale: number;
  setGraph: (
    setGraph: (
      oldGraph: Map<string, FDGNode<string>>
    ) => Map<string, FDGNode<string>>
  ) => void;
}) {
  return (
    <DraggableTreeItem
      node={props.node}
      setNode={props.setNode}
      scale={props.scale}
      setGraph={props.setGraph}
    >
      <div className="tree-item">{props.node.data}</div>
    </DraggableTreeItem>
  );
}
