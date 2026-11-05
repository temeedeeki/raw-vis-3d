import test from "node:test";
import assert from "node:assert/strict";
import { inferRawOptions } from "../js/filename.js";
import { volumeEdges } from "../js/outline.js";

test("filename infers types and trailing XYZ dimensions", () => {
  for (const [type, bytes] of [["float32", 4], ["FLOAT64", 8], ["uint8", 1]]) {
    assert.deepEqual(inferRawOptions(`scan_${type}_128x64x32.raw`), {
      bytesPerValue: bytes, dimensions: [128, 64, 32],
    });
  }
  assert.deepEqual(inferRawOptions("12x34x56.RAW"), { dimensions: [12, 34, 56] });
});

test("unknown, ambiguous or invalid names do not overwrite settings", () => {
  for (const name of ["scan.raw", "scan_0x2x3.raw", "scan_1x2x3_extra.raw", "float32_float64.raw", "scan_99999999999999999x2x3.raw"])
    assert.deepEqual(inferRawOptions(name), {});
});

test("outline has twelve distinct edges matching noncubic volume extents", () => {
  const edges = volumeEdges([4, 2, 1]);
  assert.equal(edges.length, 12);
  assert.equal(new Set(edges.map(e => JSON.stringify(e))).size, 12);
  for (const [a, b] of edges) {
    assert.equal(a.filter((v, i) => v !== b[i]).length, 1);
    assert.deepEqual(a.map(Math.abs), [0.5, 0.125, 0.25]);
  }
});
