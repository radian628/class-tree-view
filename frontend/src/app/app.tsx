import { useEffect, useState } from "react";
import { FDGConnectionSettings, FDGNode } from "../fdg/fdg-types.js";
import { ForceDirectedGraph } from "../fdg/fdg.js";
import React from "react";
import "./app.less";
import { TreeItem } from "./tree-item.js";
import { ClassSectionSearch } from "../search/ClassSectionSearch.js";

const defaultFDGNodeSettings = {
  repulsionRadius: 50,
  repulsionStrength: 0.025,
  mass: 1,
  applyForces: true,
};

const defaultConnectionSettings: FDGConnectionSettings = {
  directionality: "forwards",
  style: "solid",
  color: "black",
  targetDist: 150,
  attractStrength: 0.01,
  repelStrength: 0.1,
};

const nodeA: [string, FDGNode<string>] = [
  "a",
  {
    data: "Node A",

    ...defaultFDGNodeSettings,

    x: 300,
    y: 300,

    connections: new Map([["b", defaultConnectionSettings]]),
  },
];

const nodeB: [string, FDGNode<string>] = [
  "b",
  {
    data: "Node B",

    ...defaultFDGNodeSettings,

    x: 400,
    y: 600,

    connections: new Map([["c", defaultConnectionSettings]]),
  },
];

const nodeC: [string, FDGNode<string>] = [
  "c",
  {
    data: "Node C Hot Reload Test",

    ...defaultFDGNodeSettings,

    x: 500,
    y: 700,

    connections: new Map([]),
  },
];

export function App() {
  const [graph, setGraph] = useState(
    new Map<string, FDGNode<string>>([nodeA, nodeB, nodeC])
  );

  return (
    <div className="tree-container">
      {/* <ForceDirectedGraph
        itemTemplate={TreeItem}
        graph={graph}
        setGraph={setGraph}
      ></ForceDirectedGraph> */}
      <ClassSectionSearch
        results={[]}
        setResults={() => {}}
      ></ClassSectionSearch>
    </div>
  );
}
