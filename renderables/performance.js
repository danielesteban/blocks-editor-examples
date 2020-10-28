import {
  Color,
  Group,
  Mesh,
  PlaneBufferGeometry,
  ShaderMaterial,
  Vector3,
  VideoTexture,
} from '../core/three.js';

class Performance extends Group {
  static setupMaterial() {
    Performance.material = new ShaderMaterial({
      vertexShader: [
        'varying vec2 fragUV;',
        'void main() {',
        '  fragUV = uv;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying vec2 fragUV;',
        'uniform vec3 key;',
        'uniform sampler2D video;',
        'void main() {',
        '  vec3 fragColor = texture2D(video, fragUV).rgb;',
        '  float fragAlpha = (length(fragColor - key) - 0.5) * 7.0;',
        '  gl_FragColor = vec4(fragColor, fragAlpha);',
        '}',
      ].join('\n'),
      transparent: true,
    });
  }

  constructor({
    members,
    key,
    source,
    volume = 0.5,
  }) {
    if (!Performance.material) {
      Performance.setupMaterial();
    }
    super();

    this.aux = new Vector3();

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.volume = volume;
    video.src = source;
    this.video = video;

    const texture = new VideoTexture(this.video);
    this.texture = texture;

    const material = Performance.material.clone();
    material.uniforms.key = { value: new Color(key) };
    material.uniforms.video = { value: texture };

    const bias = 0.001;
    const stride = 1 / members;
    const width = stride - bias * 2;
    const height = 1 - bias * 2;
    const slot = 3;
    const origin = slot * members * -0.5 + slot * 0.5;
    for (let i = 0; i < members; i += 1) {
      const geometry = new PlaneBufferGeometry(4.26, 2.4);
      geometry.translate(0, geometry.parameters.height * 0.5, 0);
      const uv = geometry.getAttribute('uv');
      const offset = stride * i + bias;
      for (let j = 0; j < uv.count; j += 1) {
        const x = uv.getX(j);
        const y = uv.getY(j);
        uv.setXY(
          j,
          offset + x * width,
          bias + y * height
        );
      }
      const mesh = new Mesh(geometry, material);
      mesh.position.set(origin + i * slot, 0, 0);
      this.add(mesh);
    }
  }

  dispose() {
    const { children, texture, video } = this;
    children.forEach(({ geometry }) => (
      geometry.dispose()
    ));
    texture.dispose();
    video.pause();
    video.src = '';
  }

  resume() {
    const { video } = this;
    if (video.paused) {
      video.play();
    }
  }

  update(target) {
    const { aux, children, texture, video } = this;
    aux.copy(target);
    children.forEach((mesh) => {
      aux.y = mesh.position.y;
      mesh.lookAt(target);
    });
    texture.needsUpdate = true;
  }
}

export default Performance;
