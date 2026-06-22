export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.keysJustPressed = {};
    this.keysJustReleased = {};
    this.mouse = { dx: 0, dy: 0, buttons: 0, justClicked: false, justRightClicked: false };
    this.isPointerLocked = false;
    this.scrollDelta = 0;
    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', e => {
      const k = e.code;
      if (!this.keys[k]) this.keysJustPressed[k] = true;
      this.keys[k] = true;
      // Prevent defaults for game keys
      if (['Space','Tab'].includes(k)) e.preventDefault();
    });

    document.addEventListener('keyup', e => {
      const k = e.code;
      this.keys[k] = false;
      this.keysJustReleased[k] = true;
    });

    document.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouse.justClicked = true;
      if (e.button === 2) this.mouse.justRightClicked = true;
      this.mouse.buttons |= (1 << e.button);
    });

    document.addEventListener('mouseup', e => {
      this.mouse.buttons &= ~(1 << e.button);
    });

    document.addEventListener('mousemove', e => {
      if (!this.isPointerLocked) return;
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    });

    document.addEventListener('wheel', e => {
      this.scrollDelta += e.deltaY;
    });

    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) this.canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  isKey(code) { return !!this.keys[code]; }

  wasKeyPressed(code) { return !!this.keysJustPressed[code]; }

  wasKeyReleased(code) { return !!this.keysJustReleased[code]; }

  isMouseButton(btn) { return !!(this.mouse.buttons & (1 << btn)); }

  flush() {
    this.keysJustPressed = {};
    this.keysJustReleased = {};
    this.mouse.justClicked = false;
    this.mouse.justRightClicked = false;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.scrollDelta = 0;
  }

  unlockPointer() {
    document.exitPointerLock();
  }
}
