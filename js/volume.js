export const MAX_VOXELS = 134_217_728;

export function validateRawLayout(
  fileSize,
  { dimensions, bytesPerValue, headerBytes },
) {
  if (
    dimensions.length !== 3 ||
    dimensions.some((n) => !Number.isSafeInteger(n) || n < 1) ||
    !Number.isSafeInteger(headerBytes) ||
    headerBytes < 0
  ) {
    throw new Error(
      "寸法は正の整数、ヘッダーは 0 以上の整数で指定してください。",
    );
  }
  if (![4, 8].includes(bytesPerValue)) {
    throw new Error("対応するデータ型は Float32 / Float64 です。");
  }
  const count = dimensions.reduce((product, size) => product * size, 1);
  const expected = count * bytesPerValue + headerBytes;
  if (!Number.isSafeInteger(expected) || expected !== fileSize) {
    throw new Error(
      `ファイルサイズが一致しません。必要: ${expected.toLocaleString()} bytes / 実際: ${fileSize.toLocaleString()} bytes`,
    );
  }
  if (count > MAX_VOXELS) {
    throw new Error(
      "このビューアーでは最大 134,217,728 ボクセルに制限しています。",
    );
  }
  return count;
}

export function decodeRaw(buffer, options) {
  const count = validateRawLayout(buffer.byteLength, options);
  const view = new DataView(buffer);
  const values = new Float64Array(count);
  const { bytesPerValue, headerBytes, littleEndian } = options;
  for (let index = 0; index < count; index++) {
    const offset = headerBytes + index * bytesPerValue;
    values[index] =
      bytesPerValue === 8
        ? view.getFloat64(offset, littleEndian)
        : view.getFloat32(offset, littleEndian);
  }
  return values;
}

export function prepareVolume(values, dimensions) {
  let minimum = Infinity;
  let maximum = -Infinity;
  let nonzeroCount = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || value === 0) continue;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    nonzeroCount++;
  }
  if (nonzeroCount === 0) {
    minimum = 0;
    maximum = 1;
  }
  const scale = Math.max(Math.abs(minimum), Math.abs(maximum)) || 1;
  const textureValues = new Float32Array(values.length);
  for (let index = 0; index < values.length; index++) {
    textureValues[index] = Number.isFinite(values[index])
      ? values[index] / scale
      : 0;
  }
  const displayMinimum = Math.min(0, minimum);
  return {
    values,
    dimensions,
    scale,
    textureValues,
    nonzeroCount,
    displayMinimum,
    displayMaximum: maximum > displayMinimum ? maximum : minimum + 1,
  };
}

export function createDemoVolume() {
  const size = 64;
  const center = (size - 1) / 2;
  const values = new Float64Array(size ** 3);
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = x + size * (y + size * z);
        const radius = Math.hypot(x - center, y - center, z - center);
        if (radius < 24 && radius > 17)
          values[index] = 0.25 + (0.75 * x) / size;
        if (
          Math.hypot(x - center, y - center) < 7 &&
          Math.abs(z - center) < 28
        ) {
          values[index] = 1;
        }
      }
    }
  }
  return { values, dimensions: [size, size, size] };
}
