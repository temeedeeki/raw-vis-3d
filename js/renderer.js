import { vertexShader, fragmentShader } from "./shaders.js";

const MAX_DIMENSION_SUM = 8100;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`シェーダーのコンパイルに失敗しました: ${detail}`);
  }
  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  const shaders = [
    compileShader(gl, gl.VERTEX_SHADER, vertexShader),
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader),
  ];
  for (const shader of shaders) gl.attachShader(program, shader);
  gl.linkProgram(program);
  for (const shader of shaders) gl.deleteShader(shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const detail = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`シェーダーのリンクに失敗しました: ${detail}`);
  }
  return program;
}

export class VolumeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error(
        "WebGL 2 が利用できません。対応するブラウザーと GPU 設定を確認してください。",
      );
    }
    this.gl = gl;
    this.program = createProgram(gl);
    this.uniforms = new Map();
    gl.useProgram(this.program);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(this.uniform("volumeTexture"), 0);
  }

  uniform(name) {
    if (!this.uniforms.has(name)) {
      this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniforms.get(name);
  }

  validateDimensions(dimensions) {
    const maximum = this.gl.getParameter(this.gl.MAX_3D_TEXTURE_SIZE);
    if (
      dimensions.some((size) => size > maximum) ||
      dimensions.reduce((sum, size) => sum + size, 0) > MAX_DIMENSION_SUM
    ) {
      throw new Error(
        `GPU の寸法上限を超えています（各軸 ${maximum} 以下、各軸の合計 ${MAX_DIMENSION_SUM} 以下）。`,
      );
    }
  }

  setVolume(volume) {
    this.validateDimensions(volume.dimensions);
    const gl = this.gl;
    const nextTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, nextTexture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    for (const axis of [
      gl.TEXTURE_WRAP_S,
      gl.TEXTURE_WRAP_T,
      gl.TEXTURE_WRAP_R,
    ]) {
      gl.texParameteri(gl.TEXTURE_3D, axis, gl.CLAMP_TO_EDGE);
    }
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.R32F,
      ...volume.dimensions,
      0,
      gl.RED,
      gl.FLOAT,
      volume.textureValues,
    );
    if (gl.getError() !== gl.NO_ERROR) {
      gl.deleteTexture(nextTexture);
      gl.bindTexture(gl.TEXTURE_3D, this.texture ?? null);
      throw new Error("GPU メモリー不足またはテクスチャを作成できません。");
    }
    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = nextTexture;
    this.volume = volume;
  }

  render(camera, settings) {
    if (!this.volume) return;
    const { canvas, gl, volume } = this;
    const ratio = Math.min(window.devicePixelRatio, 1.5);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.uniform3f(this.uniform("dimensions"), ...volume.dimensions);
    gl.uniform2f(this.uniform("resolution"), width, height);
    gl.uniform2f(this.uniform("pan"), ...camera.pan);
    const parameters = {
      yaw: camera.yaw,
      pitch: camera.pitch,
      zoom: camera.zoom,
      displayMinimum: settings.minimum / volume.scale,
      displayMaximum: settings.maximum / volume.scale,
      threshold: settings.threshold,
      opacity: settings.opacity,
    };
    for (const [name, value] of Object.entries(parameters)) {
      gl.uniform1f(this.uniform(name), value);
    }
    gl.uniform1i(this.uniform("mode"), settings.mode);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
