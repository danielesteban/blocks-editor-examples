import {
  BufferAttribute,
  BufferGeometry,
  BufferGeometryUtils,
  IcosahedronGeometry,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
} from '../core/three.js';

class Orb extends Mesh {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.15, 3);
    sphere.faces.forEach((face, i) => {
      if (i % 2 === 0) {
        face.color.setHSL(0, 0, 0.5 + Math.random() * 0.25);
      } else {
        face.color.copy(sphere.faces[i - 1].color);
      }
    });
    let geometry = (new BufferGeometry()).fromGeometry(sphere);
    const offset = new Float32Array(geometry.getAttribute('color').count);
    for (let i = 0; i < offset.length; i += 4) {
      const o = Math.random();
      offset.set([o, o, o, o], i);
    }
    geometry.setAttribute('offset', new BufferAttribute(offset, 1));
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry = BufferGeometryUtils.mergeVertices(geometry);
    geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
    Orb.geometry = geometry;
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
