import { produce } from "immer";
import { mapMapValues } from "../util/map.js";
import { FDGNode } from "./fdg-types.js";

export function applyFDGPhysics<T>(graph: Map<string, FDGNode<T>>, dt: number) {
  return mapMapValues(graph, (aKey, a, i) => {
    return produce(a, (a) => {
      const xOld = a.x;
      const yOld = a.y;

      mapMapValues(graph, (bKey, b, j) => {
        if (aKey === bKey || !a.applyForces) return;

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
          a.x += ((dx * (dist - conn.targetDist) * factor) / a.mass) * dt;
          a.y += ((dy * (dist - conn.targetDist) * factor) / a.mass) * dt;

          // two elements are not connected
        } else {
          if (dist < a.repulsionRadius) {
            const factor =
              Math.min(0, -1 * (dist - a.repulsionRadius) ** 2) *
              a.repulsionStrength;
            a.x += ((dx * factor) / a.mass) * dt;
            a.y += ((dy * factor) / a.mass) * dt;
          }
        }
      });

      // const xDelta = a.x - xOld;
      // const yDelta = a.y - yOld;
      // const forceDist = Math.hypot(xDelta, yDelta);

      // if (forceDist > 0) {
      //   const xDeltaN = xDelta / forceDist;
      //   const yDeltaN = yDelta / forceDist;
      //   const xDeltaT = yDeltaN;
      //   const yDeltaT = -xDeltaN;

      //   a.x += (xDeltaT * a.xGravity + xDeltaN * a.yGravity) * dt;
      //   a.y += (yDeltaT * a.xGravity + yDeltaN * a.yGravity) * dt;
      // }
    });
  });
}
