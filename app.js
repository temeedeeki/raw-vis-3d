import { Camera } from "./js/camera.js";
import { updateAxes } from "./js/axes.js";
import { VolumeRenderer } from "./js/renderer.js";
import {
  createDemoVolume,
  decodeRaw,
  prepareVolume,
  validateRawLayout,
} from "./js/volume.js";

const element = (id) => document.getElementById(id);
const DISPLAY_RANGE_ERROR = "表示最大値は最小値より大きくしてください。";

function startViewer() {
  const canvas = element("canvas");
  const renderer = new VolumeRenderer(canvas);
  let frameRequested = false;
  let loading = false;

  function showMessage(text) {
    element("message").textContent = text;
  }

  function requestRender() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      if (element("showAxes").checked)
        updateAxes(element("axes"), camera, renderer.volume?.dimensions);
      const settings = readDisplaySettings();
      if (
        !Number.isFinite(settings.minimum) ||
        !Number.isFinite(settings.maximum) ||
        settings.maximum <= settings.minimum
      ) {
        showMessage(DISPLAY_RANGE_ERROR);
        return;
      }
      if (element("message").textContent === DISPLAY_RANGE_ERROR)
        showMessage("");
      renderer.render(camera, settings);
    });
  }

  const camera = new Camera(canvas, requestRender);
  new ResizeObserver(requestRender).observe(canvas);

  function readDisplaySettings() {
    return {
      minimum: Number(element("lo").value),
      maximum: Number(element("hi").value),
      threshold: Number(element("threshold").value) / 100,
      opacity: Number(element("opacity").value) / 100,
      mode: Number(element("mode").value),
    };
  }

  function readRawOptions() {
    return {
      dimensions: ["nx", "ny", "nz"].map((id) => Number(element(id).value)),
      bytesPerValue: Number(element("dtype").value),
      headerBytes: Number(element("offset").value),
      littleEndian: element("endian").value === "little",
    };
  }

  function displayVolume(values, dimensions, label) {
    const volume = prepareVolume(values, dimensions);
    renderer.setVolume(volume);
    element("lo").value = volume.displayMinimum;
    element("hi").value = volume.displayMaximum;
    element("shape").textContent = dimensions.join(" × ");
    element("stats").textContent =
      `${volume.nonzeroCount.toLocaleString()} nonzero · ${label}`;
    camera.reset();
    showMessage(
      volume.nonzeroCount ? "" : "すべての値が 0 または非有限値です。",
    );
  }

  function showDemo() {
    const { values, dimensions } = createDemoVolume();
    displayVolume(values, dimensions, "DEMO");
  }

  element("file").addEventListener("change", () => {
    const file = element("file").files[0];
    element("filename").textContent = file
      ? `${file.name} · ${file.size.toLocaleString()} bytes`
      : "ファイルはお使いの端末内だけで処理されます";
  });

  element("load").addEventListener("click", async () => {
    if (loading) return;
    try {
      const file = element("file").files[0];
      if (!file) throw new Error("RAW ファイルを選択してください。");
      const options = readRawOptions();
      validateRawLayout(file.size, options);
      renderer.validateDimensions(options.dimensions);
      loading = true;
      element("load").disabled = true;
      element("demo").disabled = true;
      showMessage("読み込み中…");
      // 読み込み状態を画面へ反映してからデコードする。
      await new Promise((resolve) => setTimeout(resolve, 20));
      const values = decodeRaw(await file.arrayBuffer(), options);
      displayVolume(values, options.dimensions, file.name);
    } catch (error) {
      showMessage(error.message);
    } finally {
      loading = false;
      element("load").disabled = false;
      element("demo").disabled = false;
    }
  });

  for (const id of ["lo", "hi", "threshold", "opacity", "mode"]) {
    element(id).addEventListener("input", () => {
      element("thresholdOut").value = `${element("threshold").value}%`;
      element("opacityOut").value = `${element("opacity").value}%`;
      requestRender();
    });
  }
  element("showAxes").addEventListener("change", () => {
    element("axes").toggleAttribute("hidden", !element("showAxes").checked);
    requestRender();
  });
  element("reset").addEventListener("click", () => camera.reset());
  element("demo").addEventListener("click", showDemo);
  showDemo();
}

try {
  startViewer();
} catch (error) {
  element("message").textContent = error.message;
  console.error(error);
}
