import {
  BufferAttribute,
  BoxGeometry,
  BufferGeometry,
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
    const geometry = (new BufferGeometry()).fromGeometry(box);
    const offset = new Float32Array(geometry.attributes.color.count);
    for (let i = 0; i < offset.length; i += 6) {
      const o = Math.random();
      for (let j = 0; j < 6; j += 1) {
        offset[i + j] = o;
      }
    }
    geometry.setAttribute('offset', new BufferAttribute(offset, 1))
    geometry.physics = {
      shape: 'box',
      size: [box.parameters.width * 0.5, box.parameters.height * 0.5, box.parameters.depth * 0.5],
    };
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
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
          '#include <clipping_planes_pars_vertex>',
          [
            '#include <clipping_planes_pars_vertex>',
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
      fragmentShader: fragmentShader,
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
