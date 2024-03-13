export type FDGConnectionSettings = {
  // styling properties
  directionality: "forwards" | "backwards" | "bidirectional";
  style: "solid" | "dotted";
  color: string;

  // how far away the connected nodes should ideally be
  targetDist: number;

  // how strongly the connection impacts the distance between the nodes
  attractStrength: number;
  repelStrength: number;
};

export interface FDGNode<T> {
  mass: number;
  repulsionRadius: number;
  repulsionStrength: number;
  data: T;
  xGravity: number;
  yGravity: number;

  // coordinates
  x: number;
  y: number;

  applyForces: boolean;

  connections: Map<string, FDGConnectionSettings>;
}
