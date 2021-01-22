import {
  BufferAttribute,
  BoxBufferGeometry,
  BufferGeometryUtils,
} from '../core/three.js';
import Bodies from './bodies.js';

class Boxes extends Bodies {
  static setupGeometry() {
    const box = new BoxBufferGeometry(0.3, 0.3, 0.3, 8, 8, 8);
    box.deleteAttribute('normal');
    box.deleteAttribute('uv');
    const geometry = box.toNonIndexed();
    const { count } = geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    let light;
    for (let i = 0; i < count; i += 1) {
      if (i % 6 === 0) {
        light = 0.8 - Math.random() * 0.1;
      }
      color.setXYZ(i, light, light, light);
    }
    geometry.setAttribute('color', color);
    Boxes.geometry = BufferGeometryUtils.mergeVertices(geometry);
    Boxes.geometry.physics = {
      shape: 'box',
      width: box.parameters.width,
      height: box.parameters.height,
      depth: box.parameters.depth,
    };
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
