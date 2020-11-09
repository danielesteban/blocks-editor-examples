import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Trigger extends Mesh {
  static setupMaterials() {
    Trigger.materials = {
      visible: new MeshBasicMaterial({ opacity: 0.5, transparent: true }),
      invisible: new MeshBasicMaterial({ visible: false }),
    };
  }

  constructor(width, height, depth, invisible = false) {
    if (!Trigger.materials) {
      Trigger.setupMaterials();
    }
    const geometry = new BoxBufferGeometry(width, height, depth);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    super(
      geometry,
      Trigger.materials[invisible ? 'invisible' : 'visible'],
    );
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }
}

export default Trigger;
