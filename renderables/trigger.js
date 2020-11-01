import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Trigger extends Mesh {
  static setupMaterial() {
    Trigger.material = new MeshBasicMaterial({ opacity: 0.5, transparent: true });
  }

  constructor(width, height, depth) {
    if (!Trigger.material) {
      Trigger.setupMaterial();
    }
    super(
      new BoxBufferGeometry(width, height, depth),
      Trigger.material,
    );
    this.renderer = renderer;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }
}

export default Trigger;
