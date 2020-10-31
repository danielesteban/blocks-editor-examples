import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Paddle extends Mesh {
  static setupGeometry() {
    const box = new BoxGeometry(0.15, 1.25, 0.15, 3, 25, 3);
    box.faces.forEach((face, i) => {
      if (i % 2 === 0) {
        face.color.setHSL(Math.random(), 0.4 + Math.random() * 0.2, 0.2 + Math.random() * 0.2);
      } else {
        face.color.copy(box.faces[i - 1].color);
      }
    });
    const geometry = (new BufferGeometry()).fromGeometry(box);
    geometry.physics = {
      shape: 'box',
      size: [box.parameters.width * 0.5, box.parameters.height * 0.5, box.parameters.depth * 0.5],
    };
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
    Paddle.geometry = geometry;
  }

  static setupMaterial() {
    Paddle.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor() {
    if (!Paddle.geometry) {
      Paddle.setupGeometry();
    }
    if (!Paddle.material) {
      Paddle.setupMaterial();
    }
    super(
      Paddle.geometry,
      Paddle.material
    );
  }
}

export default Paddle;
