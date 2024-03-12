export function mapMapValues<K, VI, VO>(
  map: Map<K, VI>,
  callback: (key: K, value: VI, index: number) => VO
) {
  return new Map([...map.entries()].map(([k, v], i) => [k, callback(k, v, i)]));
}
