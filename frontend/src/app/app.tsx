import { useEffect, useState } from "react";
import { FDGConnectionSettings, FDGNode } from "../fdg/fdg-types.js";
import { ForceDirectedGraph } from "../fdg/fdg.js";
import React from "react";
import "./app.less";
import { TreeItem, TreeItemView } from "./tree-item.js";
import { ClassSearch } from "../search/ClassSearch.js";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { AppRouter } from "../../../backend/api.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../api/index.js";
import {
  constructFDGStateFromPrereqTrees,
  grabAllPrereqs,
} from "./generate-tree.js";

export function App() {
  const [graph, setGraph] = useState(new Map<string, FDGNode<TreeItem>>([]));

  const [isQueryingGraph, setIsQueryingGraph] = useState(false);

  useEffect(() => {
    if (graph.size !== 0 || isQueryingGraph) return;

    (async () => {
      setIsQueryingGraph(true);
      setGraph(
        await constructFDGStateFromPrereqTrees(
          await grabAllPrereqs(new Set(["CS374"]))
        )
      );
    })();
  });

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api",
          // You can pass any HTTP headers you wish here
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="app-container">
          <div className="tree-container">
            <ForceDirectedGraph
              itemTemplate={TreeItemView}
              graph={graph}
              setGraph={setGraph}
            ></ForceDirectedGraph>
          </div>
          <div className="class-search-container">
            <ClassSearch addCourse={() => {}}></ClassSearch>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// @ts-ignore
window.grabAllPrereqs = grabAllPrereqs;
// @ts-ignore
window.constructFDGStateFromPrereqTrees = constructFDGStateFromPrereqTrees;
