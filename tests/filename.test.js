import test from "node:test";
import assert from "node:assert/strict";
import { inferRawOptions } from "../js/filename.js";

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

