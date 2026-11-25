export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function pinchRatio(landmarks) {
  const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, (a.z??0)-(b.z??0));
  return distance(landmarks[4],landmarks[8]) / Math.max(distance(landmarks[0],landmarks[9]),0.001);
}
export function pinchState(ratio, previous) { return previous ? ratio < 0.48 : ratio < 0.30; }
export function smooth(previous, value, retained, dt) {
  const alpha = retained === 0 ? 1 : 1-Math.pow(retained, Math.max(dt,1)/16.667);
  return previous + (value-previous)*alpha;
}
export function angleDelta(a,b) { return Math.atan2(Math.sin(a-b),Math.cos(a-b)); }
export function toCSV(rows) {
  if (!rows.length) return '';
  const keys=Object.keys(rows[0]);
  const escape=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  return [keys.map(escape).join(','),...rows.map(row=>keys.map(key=>escape(row[key])).join(','))].join('\r\n');
}
