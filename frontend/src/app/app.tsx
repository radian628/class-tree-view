import { useEffect, useState } from "react";
import { FDGNode } from "../fdg/fdg-types";
import { ForceDirectedGraph } from "../fdg/fdg";
import React from "react";
import "./app.less";
import { TreeItem } from "./tree-item";

const defaultFDGNodeSettings = {
  repulsionRadius: 50,
  repulsionStrength: 0.025,
  mass: 1,
  applyForces: true,
};

const defaultConnectionSettings = {
  directionality: "unidirectional",
  style: "solid",
  color: "black",
  targetDist: 150,
  attractStrength: 0.01,
  repelStrength: 0.1,
} as const;

export function App() {
  const [graph, setGraph] = useState(
    new Map<string, FDGNode<string>>([
      [
        "a",
        {
          data: "Node A",

          ...defaultFDGNodeSettings,

          x: 300,
          y: 300,

          connections: new Map([["b", defaultConnectionSettings]]),
        },
      ],
      [
        "b",
        {
          data: "Node B",

          ...defaultFDGNodeSettings,

          x: 400,
          y: 600,

          connections: new Map([]),
        },
      ],
    ])
  );

  return (
    <div className="tree-container">
      <ForceDirectedGraph
        itemTemplate={TreeItem}
        graph={graph}
        setGraph={setGraph}
      ></ForceDirectedGraph>
    </div>
  );
}
