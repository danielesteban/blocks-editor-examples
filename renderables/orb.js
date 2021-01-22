import {
  BufferAttribute,
  BufferGeometryUtils,
  IcosahedronBufferGeometry,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
} from '../core/three.js';

class Orb extends Mesh {
  static setupGeometry() {
    const sphere = new IcosahedronBufferGeometry(0.15, 3);
    sphere.deleteAttribute('normal');
    sphere.deleteAttribute('uv');
    const { count } = sphere.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    const offset = new BufferAttribute(new Float32Array(count), 1);
    let l;
    let o;
    for (let i = 0; i < count; i += 1) {
      if (i % 3 === 0) {
        l = 0.5 + Math.random() * 0.25;
        o = Math.random();
      }
      color.setXYZ(i, l, l, l);
      offset.setX(i, o);
    }
    sphere.setAttribute('color', color);
    sphere.setAttribute('offset', offset);
    Orb.geometry = BufferGeometryUtils.mergeVertices(sphere);
    Orb.geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Orb.material = new ShaderMaterial({
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
            'vColor.xyz *= 0.75 + (s > 0.5 ? 1.0 - s : s) * 0.5;',
          ].join('\n')
        ),
      fragmentShader,
      fog: true,
      vertexColors: true,
    });
  }

  constructor(color) {
    if (!Orb.geometry) {
      Orb.setupGeometry();
    }
    if (!Orb.material) {
      Orb.setupMaterial();
    }
    const material = Orb.material.clone();
    material.uniforms.diffuse.value.copy(color);
    super(
      Orb.geometry,
      material
    );
  }

  animate(animation) {
    const { material: { uniforms: { step } }, rotation, onAnimate } = this;
    rotation.y += animation.delta;
    step.value = (step.value + animation.delta * 0.5) % 1;
    if (onAnimate) {
      onAnimate(animation);
    }
  }
}

export default Orb;
