import {
  BufferGeometry,
  Color,
  InstancedMesh,
  IcosahedronGeometry,
  MeshBasicMaterial,
  SphereBufferGeometry,
} from '../core/three.js';

// Instanced spheres

class Spheres extends InstancedMesh {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.4, 3);
    sphere.faces.forEach((face, i) => {
      face.color.offsetHSL(0, 0, -(0.2 + Math.random() * 0.1));
    });
    const geometry = (new BufferGeometry()).fromGeometry(sphere);
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
    Spheres.geometries = {
      model: geometry,
      physics: new SphereBufferGeometry(sphere.parameters.radius),
    };
  }

  static setupMaterial() {
    Spheres.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor({ count = 100, material }) {
    if (!Spheres.geometries) {
      Spheres.setupGeometry();
    }
    if (!Spheres.material) {
      Spheres.setupMaterial();
    }
    super(
      Spheres.geometries.physics,
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
