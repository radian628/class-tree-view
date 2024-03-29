import { useEffect, useState } from "react";
import { FDGConnectionSettings, FDGNode } from "../fdg/fdg-types.js";
import { ForceDirectedGraph } from "../fdg/fdg.js";
import React from "react";
import "./app.less";
import {
  Satisfaction,
  TreeItem,
  TreeItemView,
  isRequirementSatisfied,
} from "./tree-item.js";
import { ClassSearch } from "../search/class-search.js";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { AppRouter } from "../../../backend/api.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../api/index.js";
import {
  constructFDGStateFromPrereqTrees,
  grabAllPrereqs,
} from "./generate-tree.js";
import { applyFDGPhysics } from "../fdg/fdg-physics.js";
import { produce } from "immer";
import { CourseRaw } from "../../../backend/load-courses.js";
import { CourseSelection } from "../search/course-selection.js";

export type GraphState = {
  taken: Set<string>;
  pruned: Set<string>;
  dragging: string | undefined;
  hovering: string | undefined;
};

export function App() {
  const [graph, setGraph] = useState(new Map<string, FDGNode<TreeItem>>([]));

  useEffect(() => {
    let keepLooping = true;

    function physicsLoop() {
      setGraph((graph) => applyFDGPhysics(graph, 1));
      if (keepLooping) requestAnimationFrame(physicsLoop);
    }
    requestAnimationFrame(physicsLoop);

    return () => {
      keepLooping = false;
    };
  }, []);

  const [isQueryingGraph, setIsQueryingGraph] = useState(false);

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

  const [graphState, setGraphState] = useState<GraphState>({
    taken: new Set(),
    pruned: new Set(),
    dragging: undefined,
    hovering: undefined,
  });

  function fixGraphArrows(graph: Map<string, FDGNode<TreeItem>>) {
    return new Map(
      produce(graph, (graph) => {
        for (const [k, v] of graph) {
          for (const [destination, connection] of v.connections) {
            const sat = isRequirementSatisfied(
              graph.get(destination),
              destination,
              graph,
              graphState.taken
            );
            if (
              sat === Satisfaction.Taken ||
              sat === Satisfaction.AvailableAndOr
            ) {
              connection.color = "#FFaa66";
            } else {
              connection.color = "#bbbbbb";
            }

            if (destination === graphState.hovering) {
              connection.color = "#0088ff";
            }
          }

          if (k === graphState.hovering) {
            for (const [dst, conn] of v.connections) {
              conn.color = "#ff0088";
            }
          }
        }
      })
    );
  }

  const graphWithBetterArrows = fixGraphArrows(graph);

  const [selectedCourses, setSelectedCourses] = useState<CourseRaw[]>([]);

  async function regenerateGraph(courses: Set<string>) {
    console.log("regen graph");
    setIsQueryingGraph(true);
    setGraph(
      await (async () => {
        let graph = await constructFDGStateFromPrereqTrees(
          await grabAllPrereqs(courses)
        );

        for (let i = 0; i < 100; i++) {
          graph = applyFDGPhysics(graph, 10);
        }
        for (let i = 0; i < 100; i++) {
          graph = applyFDGPhysics(graph, 1);
        }

        graph = produce(graph, (graph) => {
          for (const v of graph.values()) {
            v.y *= 0.5;
          }
        });

        setIsQueryingGraph(false);
        console.log("QUERIED GRAPH!!!");
        return graph;
      })()
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="app-container">
          <div className="tree-container">
            <ForceDirectedGraph
              paused={isQueryingGraph}
              itemTemplate={TreeItemView}
              graph={graphWithBetterArrows}
              setGraph={(graph) => {
                setGraph(fixGraphArrows(graph));
              }}
              state={graphState}
              setState={setGraphState}
            ></ForceDirectedGraph>
          </div>
          <div className="flex-vertical app-right-panel">
            <ClassSearch
              addCourse={(c) => {
                if (
                  !selectedCourses.find(
                    (c2) => c2.subjectCourse === c.subjectCourse
                  )
                ) {
                  const newSelectedCourses = [...selectedCourses, c];
                  setSelectedCourses(newSelectedCourses);
                  regenerateGraph(
                    new Set([...newSelectedCourses].map((c) => c.subjectCourse))
                  );
                }
              }}
            ></ClassSearch>
            <CourseSelection
              courses={selectedCourses}
              setCourses={(sc) => {
                regenerateGraph(new Set([...sc].map((c) => c.subjectCourse)));
                setSelectedCourses(sc);
              }}
            ></CourseSelection>
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
