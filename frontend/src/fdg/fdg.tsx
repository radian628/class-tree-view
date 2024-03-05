import { FDGNode } from "./fdg-types";
import { produce } from "immer";

import React, { useEffect, useRef } from "react";
import { mapMapValues } from "../util/map";

import "./fdg.less";

export function ForceDirectedGraph<T>(props: {
  graph: Map<string, FDGNode<T>>;
  setGraph: (
    setter: (old: Map<string, FDGNode<T>>) => Map<string, FDGNode<T>>
  ) => void;
  itemTemplate: (props: {
    node: FDGNode<T>;
    setNode: (setter: (oldNode: FDGNode<T>) => FDGNode<T>) => void;
  }) => React.ReactElement;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    // resize canvas if necessary
    const containerRect = container.getBoundingClientRect();
    if (canvas.width !== containerRect.width)
      canvas.width = containerRect?.width;
    if (canvas.height !== containerRect.height)
      canvas.height = containerRect?.height;

    let keepLooping = true;

    // run canvas stuff
    function frame() {
      // pairwise iteration over all elements
      props.setGraph((graph) =>
        mapMapValues(graph, (aKey, a) => {
          return produce(a, (a) => {
            mapMapValues(graph, (bKey, b) => {
              if (aKey === bKey || !a.applyForces) return;

              const dist = Math.hypot(a.x - b.x, a.y - b.y);
              const dx = (b.x - a.x) / dist;
              const dy = (b.y - a.y) / dist;

              const conn = b.connections.get(aKey);

              // two elements are connected
              if (conn) {
                const factor =
                  dist > conn.targetDist
                    ? conn.attractStrength
                    : conn.repelStrength;
                a.x += (dx * (dist - conn.targetDist) * factor) / b.mass;
                a.y += (dy * (dist - conn.targetDist) * factor) / b.mass;

                // two elements are not connected
              } else {
                if (dist < a.repulsionRadius) {
                  const factor =
                    Math.min(0, -1 * (dist - a.repulsionRadius) ** 2) *
                    a.repulsionStrength;
                  a.x += (dx * factor) / b.mass;
                  a.y += (dy * factor) / b.mass;
                }
              }
            });
          });
        })
      );
    }

    // run single frame
    requestAnimationFrame(frame);
  });

  return (
    <div className="fdg" ref={containerRef}>
      <canvas className="fdg-background-canvas" ref={canvasRef}></canvas>
      <div className="fdg-contents">
        {[...props.graph.entries()].map(([k, v]) => {
          return (
            // individual element in the FDG
            <div
              className="fdg-elem-outer"
              key={k}
              style={{
                top: `${v.y}px`,
                left: `${v.x}px`,
              }}
            >
              <props.itemTemplate
                node={v}
                setNode={(setter) => {
                  // set a single node of the graph
                  props.setGraph((graph) => {
                    const newNode = setter(graph.get(k)!);
                    return produce(
                      [graph, newNode] as [Map<string, FDGNode<T>>, FDGNode<T>],
                      ([g, nn]) => {
                        g.set(k, nn);
                      }
                    )[0];
                  });
                }}
              ></props.itemTemplate>
            </div>
          );
        })}
      </div>
    </div>
  );
}
