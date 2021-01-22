import {
  BufferAttribute,
  BoxBufferGeometry,
  BufferGeometryUtils,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
} from '../core/three.js';

// Instanced pixels

class Pixels extends InstancedMesh {
  static setupGeometry() {
    const pixel = new BoxBufferGeometry(1, 1, 1, 1, 1, 1);
    pixel.deleteAttribute('normal');
    pixel.deleteAttribute('uv');
    const geometry = pixel.toNonIndexed();
    geometry.setAttribute('position', new BufferAttribute(geometry.getAttribute('position').array.slice(0, 90), 3));
    const { count } = geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    let light;
    for (let i = 0; i < count; i += 1) {
      if (i % 6 === 0) {
        light = i >= 24 ? 1 : 0.5;
      }
      color.setXYZ(i, 0, light, light);
    }
    geometry.setAttribute('color', color);
    Pixels.geometry = BufferGeometryUtils.mergeVertices(geometry);
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Pixels.material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(uniforms),
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            'attribute float instanceColor;',
            'varying float vInstanceColor;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            '#include <begin_vertex>',
            'vInstanceColor = instanceColor;',
          ].join('\n')
        ),
      fragmentShader: fragmentShader
        .replace(
          '#include <common>',
          [
            'varying float vInstanceColor;',
            'const float ColorWheelStep = 1.0 / 3.0;',
            'vec3 ColorWheel( float pos ) {',
            '  vec3 color;',
            '  if (pos == 0.0) {',
            '    color = vec3( 0.17, 0.17, 0.17 );',
            '  } else if (pos >= 254.5) {',
            '    color = vec3( 1.0, 1.0, 1.0 );',
            '  } else {',
            '    pos = pos / 255.0;',
            '    if ( pos < ColorWheelStep ) {',
            '      color = vec3( pos * 3.0, 1.0 - pos * 3.0, 0.0 );',
            '    } else if( pos < ColorWheelStep * 2.0 ) {',
            '      pos -= ColorWheelStep;',
            '      color = vec3( 1.0 - pos * 3.0, 0.0, pos * 3.0 );',
            '    } else {',
            '      pos -= ColorWheelStep * 2.0;',
            '      color = vec3( 0.0, pos * 3.0, 1.0 - pos * 3.0 );',
            '    }',
            '    color += vec3(ColorWheelStep);',
            '  }',
            '  color.r = pow(color.r, 2.2);',
            '  color.g = pow(color.g, 2.2);',
            '  color.b = pow(color.b, 2.2);',
            '  return color;',
            '}',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( diffuse * ColorWheel(vInstanceColor), opacity );'
        ),
      fog: true,
      vertexColors: true,
    });
  }

  constructor({
    width,
    height,
    resolution = 1,
    offset = 0,
  }) {
    if (!Pixels.geometry) {
      Pixels.setupGeometry();
    }
    if (!Pixels.material) {
      Pixels.setupMaterial();
    }
    const count = (width * resolution) * (height * resolution);
    const geometry = Pixels.geometry.clone();
    geometry.setAttribute('instanceColor', (new InstancedBufferAttribute(new Float32Array(count), 1)).setUsage(DynamicDrawUsage));
    super(
      geometry,
      Pixels.material,
      count
    );
    const size = {
      x: width - (offset * 2),
      y: height - (offset * 2),
    };
    this.pixels = {
      x: width * resolution,
      y: height * resolution,
    };
    const step = {
      x: size.x / this.pixels.x,
      y: size.y / this.pixels.y,
    };
    const origin = {
      x: size.x * -0.5 + step.x * 0.5,
      y: size.y * -0.5 + step.y * 0.5,
    };
    const matrix = new Matrix4();
    matrix.makeScale(step.x * 0.75, step.y * 0.75, 0.05);
    for (let i = 0, y = 0; y < this.pixels.y; y += 1) {
      for (let x = 0; x < this.pixels.x; x += 1, i += 1) {
        matrix.setPosition(
          origin.x + x * step.x,
          origin.y + y * step.y,
          0
        );
        this.setMatrixAt(i, matrix);
      }
    }
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  update(state) {
    const { geometry } = this;
    const instances = geometry.getAttribute('instanceColor');
    state = atob(state);
    for (let i = 0; i < instances.count; i += 1) {
      instances.array[i] = state.charCodeAt(i);
    }
    instances.needsUpdate = true;
  }
}

export default Pixels;
