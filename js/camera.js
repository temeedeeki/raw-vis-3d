export class Camera {
  constructor(canvas, onChange) {
    this.onChange = onChange;
    this.reset();
    let drag = null;
    canvas.addEventListener("pointerdown", (event) => {
      drag = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      canvas.addEventListener(name, () => {
        drag = null;
      });
    }
    canvas.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const deltaX = event.clientX - drag.x;
      const deltaY = event.clientY - drag.y;
      if (event.shiftKey) {
        this.pan[0] -= deltaX * 0.002 * this.zoom;
        this.pan[1] += deltaY * 0.002 * this.zoom;
      } else {
        this.yaw -= deltaX * 0.008;
        this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch + deltaY * 0.008));
      }
      drag = { x: event.clientX, y: event.clientY };
      onChange();
    });
    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.zoom = Math.max(
          0.8,
          Math.min(12, this.zoom * Math.exp(event.deltaY * 0.001)),
        );
        onChange();
      },
      { passive: false },
    );
  }

  reset() {
    this.yaw = 0.65;
    this.pitch = 0.4;
    this.zoom = 2.7;
    this.pan = [0, 0];
    this.onChange();
  }
}
