import { projectPoint } from "./axes.js";

export function volumeEdges(dimensions) {
  const scale = Math.max(...dimensions);
  const half = [dimensions[0], dimensions[2], dimensions[1]].map(n => n / scale / 2);
  const corners = Array.from({ length: 8 }, (_, i) => half.map((n, axis) => (i & (1 << axis)) ? n : -n));
  const edges = [];
  for (let i = 0; i < 8; i++) {
    for (let axis = 0; axis < 3; axis++) {
      const j = i ^ (1 << axis);
      if (i < j) edges.push([corners[i], corners[j]]);
    }
  }
  return edges;
}

export function updateOutline(svg, camera, dimensions) {
  if (!dimensions) return;
  const width = svg.clientWidth, height = svg.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const nodes = [];
  for (const edge of volumeEdges(dimensions)) {
    const [start, end] = edge.map(point => projectPoint(point, camera, width, height));
    if (!start || !end) continue;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start[0]);
    line.setAttribute("y1", start[1]);
    line.setAttribute("x2", end[0]);
    line.setAttribute("y2", end[1]);
    nodes.push(line);
  }
  svg.replaceChildren(...nodes);
}
