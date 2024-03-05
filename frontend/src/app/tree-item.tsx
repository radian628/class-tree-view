import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types";
import React from "react";
import { DraggableTreeItem } from "../fdg/draggable-tree-item";

export function TreeItem(props: {
  node: FDGNode<string>;
  setNode: (setter: (oldNode: FDGNode<string>) => FDGNode<string>) => void;
}) {
  return (
    <DraggableTreeItem node={props.node} setNode={props.setNode}>
      {props.node.data}
    </DraggableTreeItem>
  );
}
