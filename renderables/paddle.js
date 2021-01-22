import {
  BufferAttribute,
  BoxBufferGeometry,
  BufferGeometryUtils,
  Color,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
} from '../core/three.js';

class Paddle extends Mesh {
  static setupGeometry() {
    const box = new BoxBufferGeometry(0.15, 1.25, 0.15, 3, 25, 3);
    box.deleteAttribute('normal');
    box.deleteAttribute('uv');
    const geometry = box.toNonIndexed();
    const { count } = geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    const offset = new BufferAttribute(new Float32Array(count), 1);
    const auxColor = new Color();
    let o;
    for (let i = 0; i < count; i += 1) {
      if (i % 6 === 0) {
        auxColor.setHSL(Math.random(), 0.4 + Math.random() * 0.2, 0.2 + Math.random() * 0.2);
        o = Math.random();
      }
      color.setXYZ(i, auxColor.r, auxColor.g, auxColor.b);
      offset.setX(i, o);
    }
    geometry.setAttribute('color', color);
    geometry.setAttribute('offset', offset);
    Paddle.geometry = BufferGeometryUtils.mergeVertices(geometry);
    Paddle.geometry.physics = {
      shape: 'box',
      width: box.parameters.width,
      height: box.parameters.height,
      depth: box.parameters.depth,
    };
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Paddle.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        step: { value: 0 },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'attribute float offset;',
            'uniform float step;',
          ].join('\n')
        )
        .replace(
          '#include <color_vertex>',
          [
            '#include <color_vertex>',
            'float s = mod(step + offset, 1.0);',
            'vColor.xyz *= 0.5 + (s > 0.5 ? 1.0 - s : s);',
          ].join('\n')
        ),
      fragmentShader,
      fog: true,
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

  static animate({ delta }) {
    const { material: { uniforms: { step } } } = Paddle;
    step.value = (step.value + delta * 0.5) % 1;
  }
}

export default Paddle;
