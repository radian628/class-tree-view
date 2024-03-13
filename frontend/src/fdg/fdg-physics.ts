import { produce } from "immer";
import { mapMapValues } from "../util/map.js";
import { FDGNode } from "./fdg-types.js";

export function applyFDGPhysics<T>(graph: Map<string, FDGNode<T>>, dt: number) {
  return produce(graph, (graph) => {
    let i = 0;
    for (const [aKey, a] of graph) {
      let j = 0;
      const xOld = a.x;
      const yOld = a.y;
      for (const [bKey, b] of graph) {
        if (aKey === bKey) continue;

        let dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < 0.000001) {
          if (i > j) a.x -= 10;
          dist += 10;
        }

        const dx = (b.x - a.x) / dist;
        const dy = (b.y - a.y) / dist;

        if (isNaN(a.x) || isNaN(a.y) || isNaN(dx) || isNaN(dy) || isNaN(dist))
          console.log(a.x, a.y, dx, dy, dist);

        const conn = b.connections.get(aKey);

        // two elements are connected
        if (conn) {
          const factor =
            dist > conn.targetDist ? conn.attractStrength : conn.repelStrength;
          const xMove = dx * (dist - conn.targetDist) * factor * dt;
          const yMove = dy * (dist - conn.targetDist) * factor * dt;

          if (a.applyForces) {
            a.x += xMove / a.mass;
            a.y += yMove / a.mass;
          }

          if (b.applyForces) {
            b.x -= xMove / b.mass;
            b.y -= yMove / b.mass;
          }

          // two elements are not connected
        } else {
          const hitDist = a.repulsionRadius + b.repulsionRadius;
          if (dist < hitDist) {
            const factor =
              Math.min(0, -1 * (dist - hitDist) ** 2) * a.repulsionStrength;
            const xMove = dx * factor * dt;
            const yMove = dy * factor * dt;

            if (a.applyForces) {
              a.x += xMove / a.mass;
              a.y += yMove / a.mass;
            }

            if (b.applyForces) {
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
