import { produce } from "immer";
import { mapMapValues } from "../util/map.js";
import { FDGNode } from "./fdg-types.js";

export function applyFDGPhysics<T>(
  graph: Map<string, FDGNode<T>>,
  dt: number,
  externallyControlledElements = new Set<string>()
) {
  return produce(graph, (graph) => {
    let i = 0;
    for (const [aKey, a] of graph) {
      let j = 0;
      const xOld = a.x;
      const yOld = a.y;
      for (const [bKey, b] of graph) {
        const applyForcesA =
          a.applyForces && !externallyControlledElements.has(aKey);
        const applyForcesB =
          b.applyForces && !externallyControlledElements.has(bKey);

        if (aKey === bKey) continue;
        if (!a.applyForces && !b.applyForces) continue;

        let dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < 0.000001) {
          if (i > j) a.x -= 10;
          dist += 10;
        }

        const dx = (b.x - a.x) / dist;
        const dy = (b.y - a.y) / dist;

        const conn = b.connections.get(aKey);

        // two elements are connected
        if (conn) {
          const factor =
            dist > conn.targetDist ? conn.attractStrength : conn.repelStrength;
          const xMove = dx * (dist - conn.targetDist) * factor * dt;
          let yMove = dy * (dist - conn.targetDist) * factor * dt;

          let moveDown = dy < 0 ? Math.abs(dy) * dist * 0.1 : 0;
          let moveUp = moveDown * 0.5;

          if (applyForcesA) {
            a.x += xMove / a.mass;
            a.y += yMove / a.mass;
            a.y -= moveUp;
          }

          if (applyForcesB) {
            b.x -= xMove / b.mass;
            b.y -= yMove / b.mass;
            b.y += moveDown;
          }

          // two elements are not connected
        } else {
          const hitDist = a.repulsionRadius + b.repulsionRadius;
          if (dist < hitDist) {
            const factor =
              Math.min(0, -1 * (dist - hitDist) ** 2) * a.repulsionStrength;
            const xMove = dx * factor * dt;
            const yMove = dy * factor * dt;

            if (applyForcesA) {
              a.x += xMove / a.mass;
              a.y += yMove / a.mass;
            }

            if (applyForcesB) {
              b.x -= xMove / b.mass;
              b.y -= yMove / b.mass;
            }
          }
        }
        j++;
      }
      i++;
    }
  });
}
