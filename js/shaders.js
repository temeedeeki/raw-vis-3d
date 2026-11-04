export const vertexShader = `#version 300 es
in vec2 position;
out vec2 screenPosition;

void main() {
  screenPosition = position;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragmentShader = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec2 screenPosition;
out vec4 color;
uniform sampler3D volumeTexture;
uniform vec3 dimensions;
uniform vec2 resolution;
uniform float yaw, pitch, zoom;
uniform float displayMinimum, displayMaximum, threshold, opacity;
uniform vec2 pan;
uniform int mode;

void main() {
  vec3 worldDimensions = dimensions.xzy;
  vec3 boxSize = worldDimensions / max(dimensions.x, max(dimensions.y, dimensions.z));

  vec3 eyeDirection = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 cameraRight = normalize(cross(vec3(0, 1, 0), eyeDirection));
  vec3 cameraUp = cross(eyeDirection, cameraRight);
  vec3 rayOrigin = eyeDirection * zoom + cameraRight * pan.x + cameraUp * pan.y;
  vec3 rayDirection = normalize(
    -eyeDirection * 1.9
    + cameraRight * screenPosition.x * resolution.x / resolution.y
    + cameraUp * screenPosition.y
  );

  vec3 inverseDirection = 1.0 / rayDirection;
  vec3 firstPlane = (-boxSize * 0.5 - rayOrigin) * inverseDirection;
  vec3 lastPlane = (boxSize * 0.5 - rayOrigin) * inverseDirection;
  vec3 nearPlane = min(firstPlane, lastPlane);
  vec3 farPlane = max(firstPlane, lastPlane);
  float entryDistance = max(0.0, max(nearPlane.x, max(nearPlane.y, nearPlane.z)));
  float exitDistance = min(farPlane.x, min(farPlane.y, farPlane.z));
  if (entryDistance > exitDistance) {
    color = vec4(0);
    return;
  }

  vec3 cellSize = boxSize / worldDimensions;
  vec3 entryPoint = rayOrigin + rayDirection * (entryDistance + 0.000001);
  ivec3 cell = ivec3(clamp(
    floor((entryPoint + boxSize * 0.5) / cellSize), vec3(0), worldDimensions - 1.0
  ));
  ivec3 stepDirection = ivec3(sign(rayDirection));
  vec3 nextEdge = (vec3(cell) + step(vec3(0), rayDirection)) * cellSize - boxSize * 0.5;
  vec3 nextDistance = (nextEdge - rayOrigin) / rayDirection;
  vec3 distanceIncrement = abs(cellSize / rayDirection);
  vec3 normal = -sign(rayDirection)
    * step(nearPlane.yzx, nearPlane.xyz) * step(nearPlane.zxy, nearPlane.xyz);
  vec4 accumulated = vec4(0);

  for (int iteration = 0; iteration < 8192; iteration++) {
    if (any(lessThan(cell, ivec3(0)))
        || any(greaterThanEqual(cell, ivec3(worldDimensions)))) break;

    ivec3 rawCell = ivec3(cell.x, cell.z, int(dimensions.z) - 1 - cell.y);
    float value = texelFetch(volumeTexture, rawCell, 0).r;
    float intensity = clamp((value - displayMinimum) / (displayMaximum - displayMinimum), 0.0, 1.0);
    float cutoff = displayMinimum + threshold * (displayMaximum - displayMinimum);
    if (value != 0.0 && value >= cutoff) {
      float shading = 0.65 + 0.35 * abs(dot(normal, normalize(vec3(0.4, 0.8, 1.0))));
      float gray = mix(0.08, 1.0, intensity) * shading;
      float alpha = mode == 0 ? opacity : opacity * mix(0.015, 0.28, intensity);

      accumulated.rgb += (1.0 - accumulated.a) * alpha * vec3(gray);
      accumulated.a += (1.0 - accumulated.a) * alpha;
      if (accumulated.a > 0.985) break;
    }

    int axis = nextDistance.x < nextDistance.y
      ? (nextDistance.x < nextDistance.z ? 0 : 2)
      : (nextDistance.y < nextDistance.z ? 1 : 2);
    if (nextDistance[axis] > exitDistance) break;
    cell[axis] += stepDirection[axis];
    nextDistance[axis] += distanceIncrement[axis];
    normal = vec3(0);
    normal[axis] = -float(stepDirection[axis]);
  }

  color = accumulated.a > 0.0
    ? vec4(accumulated.rgb / accumulated.a, accumulated.a)
    : vec4(0);
}
`;
