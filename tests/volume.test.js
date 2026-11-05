import test from "node:test";
import assert from "node:assert/strict";
import { decodeRaw, prepareVolume, validateRawLayout } from "../js/volume.js";

for (const bytesPerValue of [4, 8]) {
  for (const littleEndian of [false, true]) {
    test(`Float${bytesPerValue * 8}, ${littleEndian ? "LE" : "BE"}, header and XYZ order`, () => {
      const options = {
        dimensions: [2, 1, 2],
        bytesPerValue,
        headerBytes: 3,
        littleEndian,
      };
      const buffer = new ArrayBuffer(3 + 4 * bytesPerValue);
      const view = new DataView(buffer);
      const expected = [0, 0.5, -2, 16];
      expected.forEach((value, index) => {
        const offset = 3 + index * bytesPerValue;
        if (bytesPerValue === 8) view.setFloat64(offset, value, littleEndian);
        else view.setFloat32(offset, value, littleEndian);
      });
      assert.deepEqual([...decodeRaw(buffer, options)], expected);
    });
  }
}

test("invalid dimensions, header, size and volume limit are rejected", () => {
  const options = { dimensions: [2, 1, 2], bytesPerValue: 8, headerBytes: 0 };
  assert.throws(() => validateRawLayout(31, options), /サイズ/);
  assert.throws(
    () => validateRawLayout(32, { ...options, dimensions: [2, 0, 2] }),
    /寸法/,
  );
  assert.throws(
    () => validateRawLayout(32, { ...options, headerBytes: -1 }),
    /ヘッダー/,
  );
  assert.throws(
    () =>
      validateRawLayout(2048 ** 3 * 8, {
        ...options,
        dimensions: [2048, 2048, 2048],
      }),
    /最大/,
  );
});

test("normalization preserves CPU values and makes nonfinite values transparent", () => {
  const values = new Float64Array([0, -2, 4, NaN, Infinity]);
  const volume = prepareVolume(values, [5, 1, 1]);
  assert.equal(volume.values, values);
  assert.equal(volume.scale, 4);
  assert.equal(volume.nonzeroCount, 2);
  assert.deepEqual([...volume.textureValues], [0, -0.5, 1, 0, 0]);
  assert.equal(volume.displayMinimum, -2);
  assert.equal(volume.displayMaximum, 4);
});

test("empty and negative-only volumes have usable display ranges", () => {
  const empty = prepareVolume(new Float64Array([0, NaN]), [2, 1, 1]);
  assert.equal(empty.nonzeroCount, 0);
  assert.equal(empty.displayMinimum, 0);
  assert.equal(empty.displayMaximum, 1);
  const negative = prepareVolume(new Float64Array([-5, -2]), [2, 1, 1]);
  assert.equal(negative.displayMinimum, -5);
  assert.equal(negative.displayMaximum, -2);
});

test("Uint8 decodes the full unsigned range with a header", () => {
  const buffer = new Uint8Array([99, 0, 127, 128, 255]).buffer;
  const options = { dimensions: [2, 2, 1], bytesPerValue: 1, headerBytes: 1, littleEndian: false };
  assert.deepEqual([...decodeRaw(buffer, options)], [0, 127, 128, 255]);
  assert.throws(() => decodeRaw(buffer.slice(1), options), /サイズ/);
});
