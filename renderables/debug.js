import {
  IcosahedronBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Debug extends Mesh {
  static setupGeometry() {
    Debug.geometry = new IcosahedronBufferGeometry(1, 3);
  }

  static setupMaterial() {
    Debug.material = new MeshBasicMaterial({
      color: 0xFF00FF,
      transparent: true,
      opacity: 0.5,
    });
  }

  constructor() {
    if (!Debug.geometry) {
      Debug.setupGeometry();
    }
    if (!Debug.material) {
      Debug.setupMaterial();
    }
    super(
      Debug.geometry,
      Debug.material,
    );
  }
}

export default Debug;
