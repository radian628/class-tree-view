export interface FDGNode<T> {
  mass: number;
  repulsionRadius: number;
  repulsionStrength: number;
  data: T;

  // coordinates
  x: number;
  y: number;

  applyForces: boolean;

  connections: Map<
    string,
    {
      // styling properties
      directionality: "unidirectional" | "bidirectional";
      style: "solid" | "dotted";
      color: string;

      // how far away the connected nodes should ideally be
      targetDist: number;

      // how strongly the connection impacts the distance between the nodes
      attractStrength: number;
      repelStrength: number;
    }
  >;
}
