import { BoxGeometry, BufferGeometry } from '../core/three.js';
import Bodies from './bodies.js';

class Boxes extends Bodies {
  static setupGeometry() {
    const box = new BoxGeometry(0.3, 0.3, 0.3, 8, 8, 8);
    box.faces.forEach((face, i) => {
      if (i % 2 === 0) {
        face.color.offsetHSL(0, 0, -(0.2 + Math.random() * 0.1));
      } else {
        face.color.copy(box.faces[i - 1].color);
      }
    });
    const geometry = (new BufferGeometry()).fromGeometry(box);
    geometry.physics = {
      shape: 'box',
      width: box.parameters.width,
      height: box.parameters.height,
      depth: box.parameters.depth,
    };
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    Boxes.geometry = geometry;
  }

  constructor({ count = 100, material }) {
    if (!Boxes.geometry) {
      Boxes.setupGeometry();
    }
    super({
      count,
      material,
      geometry: Boxes.geometry,
    });
  }
}

export default Boxes;
