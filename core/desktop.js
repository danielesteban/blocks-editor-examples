import {
  Euler,
  Raycaster,
  Vector2,
  Vector3,
} from './three.js';

// Player desktop controls

// This were an afterthought and are mostly used just for debugging.
// If you really want a good desktop experience with some sort of
// nav meshing or collisions, you will prolly need to reimplement this.
// And maybe use the opportunity to merge them into the player class with
// a standarized input model for multiple arbitrary control devices.

class DesktopControls {
  constructor({ enabled = true, renderer, xr }) {
    this.isDesktop = true;
    this.isEnabled = enabled;
    this.aux = {
      center: new Vector2(),
      direction: new Vector3(),
      euler: new Euler(0, 0, 0, 'YXZ'),
      forward: new Vector3(),
      right: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.buttons = {
      primary: false,
      secondary: false,
    };
    this.buttonState = { ...this.buttons };
    this.keyboard = new Vector3(0, 0, 0);
    this.pointer = new Vector2(0, 0);
    this.raycaster = new Raycaster();
    this.renderer = renderer;
    this.xr = xr;
    this.onBlur = this.onBlur.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onPointerLock = this.onPointerLock.bind(this);
    this.requestPointerLock = this.requestPointerLock.bind(this);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    renderer.addEventListener('mousedown', this.requestPointerLock);
  }

  dispose() {
    const { isLocked, renderer } = this;
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    renderer.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    if (isLocked) {
      document.exitPointerLock();
    }
  }

  onAnimationTick({ delta, camera, player }) {
    const {
      aux,
      buttons,
      buttonState,
      keyboard,
      isEnabled,
      isLocked,
      pointer,
      raycaster,
      xr,
    } = this;
    if (!isEnabled || !isLocked) {
      return;
    }
    if (xr.enabled && xr.isPresenting) {
      document.exitPointerLock();
      return;
    }
    if (pointer.x !== 0 || pointer.y !== 0) {
      const { euler } = this.aux;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= pointer.x * 0.003;
      euler.x -= pointer.y * 0.003;
      const PI_2 = Math.PI / 2;
      euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
      camera.quaternion.setFromEuler(euler);
      pointer.set(0, 0);
    }
    if (keyboard.x !== 0 || keyboard.y !== 0 || keyboard.z !== 0) {
      const {
        direction,
        forward,
        right,
        worldUp,
      } = this.aux;
      camera.getWorldDirection(forward);
      right.crossVectors(forward, worldUp);
      player.move(
        direction
          .set(0, 0, 0)
          .addScaledVector(right, keyboard.x)
          .addScaledVector(worldUp, keyboard.y)
          .addScaledVector(forward, keyboard.z)
          .normalize()
          .multiplyScalar(delta * 6)
      );
    }
    ['primary', 'secondary'].forEach((button) => {
      const state = buttonState[button];
      buttons[`${button}Down`] = state && buttons[button] !== state;
      buttons[`${button}Up`] = !state && buttons[button] !== state;
      buttons[button] = state;
    });
    raycaster.setFromCamera(aux.center, camera);
  }

  onBlur() {
    const { buttonState, keyboard } = this;
    buttonState.primary = false;
    buttonState.secondary = false;
    keyboard.set(0, 0, 0);
  }

  onKeyDown({ keyCode, repeat }) {
    const { keyboard } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
        keyboard.y = -1;
        break;
      case 32:
        keyboard.y = 1;
        break;
      case 87:
        keyboard.z = 1;
        break;
      case 83:
        keyboard.z = -1;
        break;
      case 65:
        keyboard.x = -1;
        break;
      case 68:
        keyboard.x = 1;
        break;
      default:
        break;
    }
  }

  onKeyUp({ keyCode, repeat }) {
    const { keyboard } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
      case 32:
        keyboard.y = 0;
        break;
      case 87:
      case 83:
        keyboard.z = 0;
        break;
      case 65:
      case 68:
        keyboard.x = 0;
        break;
      default:
        break;
    }
  }

  onMouseDown({ button }) {
    const { buttonState, isEnabled, isLocked } = this;
    if (!isEnabled || !isLocked) {
      return;
    }
    switch (button) {
      case 0:
        buttonState.primary = true;
        break;
      case 2:
        buttonState.secondary = true;
        break;
      default:
        break;
    }
  }

  onMouseMove({ movementX, movementY }) {
    const { isEnabled, isLocked, pointer } = this;
    if (!isEnabled || !isLocked) {
      return;
    }
    pointer.set(movementX, movementY);
  }

  onMouseUp({ button }) {
    const { buttonState, isEnabled, isLocked } = this;
    if (!isEnabled || !isLocked) {
      return;
    }
    switch (button) {
      case 0:
        buttonState.primary = false;
        break;
      case 2:
        buttonState.secondary = false;
        break;
      default:
        break;
    }
  }

  onPointerLock() {
    this.isLocked = !!document.pointerLockElement;
    if (!this.isLocked) {
      this.onBlur();
    }
  }

  requestPointerLock() {
    const { isEnabled, isLocked, xr } = this;
    if (!isEnabled || isLocked || (xr.enabled && xr.isPresenting)) {
      return;
    }
    document.body.requestPointerLock();
  }
}

export default DesktopControls;
