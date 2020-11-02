import {
  BufferGeometry,
  Color,
  InstancedMesh,
  IcosahedronGeometry,
  MeshBasicMaterial,
  SphereBufferGeometry,
} from '../core/three.js';

class Spheres extends InstancedMesh {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.2, 3);
    sphere.faces.forEach((face) => (
      face.color.offsetHSL(0, 0, -(0.2 + Math.random() * 0.1))
    ));
    const geometry = (new BufferGeometry()).fromGeometry(sphere);
    geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    Spheres.geometry = geometry;
  }

  static setupMaterial() {
    Spheres.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor({ count = 100, material }) {
    if (!Spheres.geometry) {
      Spheres.setupGeometry();
    }
    if (!Spheres.material) {
      Spheres.setupMaterial();
    }
    super(
      Spheres.geometry,
      material || Spheres.material,
      count
    );
    const color = new Color();
    for (let i = 0; i < count; i += 1) {
      this.setColorAt(i, color.setHex(0xFFFFFF * Math.random()));
    }
  }
}

export default Spheres;
