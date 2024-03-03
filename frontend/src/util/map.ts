export function mapMapValues<K, VI, VO>(
  map: Map<K, VI>,
  callback: (key: K, value: VI) => VO
) {
  return new Map([...map.entries()].map(([k, v]) => [k, callback(k, v)]));
}
