export function inferRawOptions(name) {
  const types = [...name.matchAll(/float32|float64|uint8/gi)].map(match => match[0].toLowerCase());
  const unique = [...new Set(types)];
  const result = {};
  if (unique.length === 1) result.bytesPerValue = { float32: 4, float64: 8, uint8: 1 }[unique[0]];
  const shape = name.match(/(?:^|[^0-9])(\d+)x(\d+)x(\d+)\.raw$/i);
  if (shape) {
    const dimensions = shape.slice(1).map(Number);
    if (dimensions.every(n => Number.isSafeInteger(n) && n > 0)) result.dimensions = dimensions;
  }
  return result;
}
