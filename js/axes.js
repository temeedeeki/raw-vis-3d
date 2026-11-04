// Match the perspective projection used by the volume shader.
export function projectPoint(point, camera, width, height) {
  const sy = Math.sin(camera.yaw), cy = Math.cos(camera.yaw);
  const sp = Math.sin(camera.pitch), cp = Math.cos(camera.pitch);
  const right = point[0] * cy - point[2] * sy - camera.pan[0];
  const up = -point[0] * sp * sy + point[1] * cp - point[2] * sp * cy - camera.pan[1];
  const depth = camera.zoom - (point[0] * sy * cp + point[1] * sp + point[2] * cy * cp);
  if (depth <= 0.01) return null;
  return [width / 2 + right * 1.9 * height / (2 * depth),
    height / 2 - up * 1.9 * height / (2 * depth)];
}

export function updateAxes(svg, camera, dimensions) {
  if (!dimensions) return;
  const width = svg.clientWidth, height = svg.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const scale = Math.max(...dimensions);
  // RAW (0, 0, 0) is at the upper corner: X → X, Y → Z, Z → -Y.
  const origin = [-dimensions[0] / scale / 2, dimensions[2] / scale / 2, -dimensions[1] / scale / 2];
  const start = projectPoint(origin, camera, width, height);
  const ns = "http://www.w3.org/2000/svg";
  const nodes = [];
  if (start) {
    for (const [label, color, direction] of [
      ["X", "#f08b91", [1, 0, 0]],
      ["Y", "#6be4c0", [0, 0, 1]],
      ["Z", "#8dbbff", [0, -1, 0]],
    ]) {
      const end = projectPoint(origin.map((v, i) => v + direction[i] * 0.18), camera, width, height);
      const caption = projectPoint(origin.map((v, i) => v + direction[i] * 0.23), camera, width, height);
      if (!end || !caption) continue;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", start[0]);
      line.setAttribute("y1", start[1]);
      line.setAttribute("x2", end[0]);
      line.setAttribute("y2", end[1]);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "1.5");
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", caption[0]);
      text.setAttribute("y", caption[1]);
      text.setAttribute("fill", color);
      text.textContent = label;
      nodes.push(line, text);
    }
  }
  svg.replaceChildren(...nodes);
}
