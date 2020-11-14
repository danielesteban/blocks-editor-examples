import {
  BufferAttribute,
  BoxGeometry,
  BufferGeometry,
  BufferGeometryUtils,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
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
    let geometry = (new BufferGeometry()).fromGeometry(box);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry = BufferGeometryUtils.mergeVertices(geometry);
    const offset = new Float32Array(geometry.getAttribute('color').count);
    for (let i = 0; i < offset.length; i += 4) {
      const o = Math.random();
      offset.set([o, o, o, o], i);
    }
    geometry.setAttribute('offset', new BufferAttribute(offset, 1));
    geometry.physics = {
      shape: 'box',
      width: box.parameters.width,
      height: box.parameters.height,
      depth: box.parameters.depth,
    };
    Paddle.geometry = geometry;
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
    if (step.value >= 1) {
      this.visible = false;
    }
  }
}

export default Paddle;
