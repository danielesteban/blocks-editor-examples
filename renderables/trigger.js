import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Trigger extends Mesh {
  static setupGeometry() {
    Trigger.geometry = new BoxBufferGeometry(1, 1, 1);
    Trigger.geometry.deleteAttribute('normal');
    Trigger.geometry.deleteAttribute('uv');
  }
  static setupMaterial() {
    Trigger.material = new MeshBasicMaterial({ opacity: 0.5, transparent: true });
  }

  constructor(width, height, depth) {
    if (!Trigger.geometry) {
      Trigger.setupGeometry();
    }
    if (!Trigger.material) {
      Trigger.setupMaterial();
    }
    super(
      Trigger.geometry,
      Trigger.material,
    );
    this.scale.set(width, height, depth);
    this.physics = {
      shape: 'box',
      width,
      height,
      depth,
    };
  }
}

export default Trigger;
