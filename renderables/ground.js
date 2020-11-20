import {
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Ground extends Mesh {
  static setupGeometry() {
    Ground.geometry = new PlaneBufferGeometry(1, 1);
    Ground.geometry.rotateX(Math.PI * -0.5);
    Ground.geometry.translate(0, 0.5, 0);
    Ground.geometry.deleteAttribute('normal');
    Ground.geometry.deleteAttribute('uv');
  }

  static setupMaterial() {
    Ground.material = new MeshBasicMaterial();
  }

  constructor(width, depth, color) {
    if (!Ground.geometry) {
      Ground.setupGeometry();
    }
    if (!Ground.material) {
      Ground.setupMaterial();
    }
    super(
      Ground.geometry,
      Ground.material.clone()
    );
    this.position.y = -0.5;
    this.material.color.setHex(color);
    this.scale.set(width, 1, depth);
    this.physics = {
      shape: 'box',
      width,
      height: 1,
      depth,
    };
  }
}

export default Ground;
