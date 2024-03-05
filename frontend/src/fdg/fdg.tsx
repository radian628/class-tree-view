import { FDGNode } from "./fdg-types";
import { produce } from "immer";

import React, { useEffect, useRef, useState } from "react";
import { mapMapValues } from "../util/map";

import "./fdg.less";
import { intersectLineSegmentStartingAtBoxCenter } from "../util/geometry";

export type FDGItemProps<T> = {
  node: FDGNode<T>;
  setNode: (setter: (oldNode: FDGNode<T>) => FDGNode<T>) => void;
  scale: number;
};

export type FDGItemComponent<T> = (
  props: FDGItemProps<T>
) => React.ReactElement;

export function ForceDirectedGraph<T>(props: {
  graph: Map<string, FDGNode<T>>;
  setGraph: (
    setter: (old: Map<string, FDGNode<T>>) => Map<string, FDGNode<T>>
  ) => void;
  itemTemplate: FDGItemComponent<T>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerElementsRef = useRef<Map<string, HTMLDivElement | null>>(
    new Map()
  );

  const [isClickingCanvas, setIsClickingCanvas] = useState(false);

  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });

  const [scale, setScale] = useState(1);

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

    // run per-frame stuff
    function frame() {
      // update canvas
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // draw all connections on canvas
      for (const [keyA, node] of props.graph.entries()) {
        for (const [keyB, connection] of node.connections.entries()) {
          const elementB = innerElementsRef.current.get(keyA);
          const elementA = innerElementsRef.current.get(keyB);

          if (!elementA || !elementB) continue;

          const rect1 = elementA.getBoundingClientRect();
          const rect2 = elementB.getBoundingClientRect();

          const xCenter1 = rect1.width / 2 + rect1.left;
          const xCenter2 = rect2.width / 2 + rect2.left;
          const yCenter1 = rect1.height / 2 + rect1.top;
          const yCenter2 = rect2.height / 2 + rect2.top;

          const p2 = intersectLineSegmentStartingAtBoxCenter(
            rect1.left,
            rect1.top,
            rect1.left + rect1.width,
            rect1.top + rect1.height,
            xCenter2,
            yCenter2
          );
          const p1 = intersectLineSegmentStartingAtBoxCenter(
            rect2.left,
            rect2.top,
            rect2.left + rect2.width,
            rect2.top + rect2.height,
            xCenter1,
            yCenter1
          );

          const dir = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const arrowLen = 20 * scale;
          const arrowAngle = (Math.PI * 2.5) / 3;

          ctx.lineWidth = 6 * scale;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#888888";
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.moveTo(
            p2.x + Math.cos(dir + arrowAngle) * arrowLen,
            p2.y + Math.sin(dir + arrowAngle) * arrowLen
          );
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(
            p2.x + Math.cos(dir - arrowAngle) * arrowLen,
            p2.y + Math.sin(dir - arrowAngle) * arrowLen
          );
          ctx.stroke();
        }
      }

      // modify graph
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

  useEffect(() => {
    const mousemove = (e: MouseEvent) => {
      if (!isClickingCanvas) return;

      setPositionOffset({
        x: positionOffset.x - e.movementX / scale,
        y: positionOffset.y - e.movementY / scale,
      });
    };

    const mouseup = (e: MouseEvent) => {
      setIsClickingCanvas(false);
    };

    document.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);

    return () => {
      document.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };
  });

  return (
    <div className="fdg" ref={containerRef}>
      <canvas className="fdg-background-canvas" ref={canvasRef}></canvas>
      <div
        className="fdg-contents"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          console.log("got here!!!!!");
          setIsClickingCanvas(true);
        }}
        onWheel={(e) => {
          setScale(scale * (1 + e.deltaY * 0.001));
        }}
      >
        <div
          className="fdg-contents-inner"
          style={{
            transform: `scale(${scale})`,
          }}
        >
          {[...props.graph.entries()].map(([k, v]) => {
            return (
              // individual element in the FDG
              <div
                className="fdg-elem-outer"
                key={k}
                style={{
                  top: `${v.y - positionOffset.y}px`,
                  left: `${v.x - positionOffset.x}px`,
                }}
                ref={(elt) => {
                  innerElementsRef.current.set(k, elt);
                }}
              >
                <props.itemTemplate
                  scale={scale}
                  node={v}
                  setNode={(setter) => {
                    // set a single node of the graph
                    props.setGraph((graph) => {
                      const newNode = setter(graph.get(k)!);
                      return produce(
                        [graph, newNode] as [
                          Map<string, FDGNode<T>>,
                          FDGNode<T>
                        ],
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
    </div>
  );
}
