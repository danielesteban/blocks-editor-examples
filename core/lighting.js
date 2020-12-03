import {
  Color,
  DataTexture3D,
  LinearFilter,
  ShaderMaterial,
  ShaderLib,
  UniformsUtils,
  Vector3,
} from './three.js';

class Lighting extends ShaderMaterial {
  constructor({
    baseShader = 'basic',
    channels,
    intensity = 1,
    occlusion,
    scale,
  }) {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib[baseShader];
    const texture = new DataTexture3D(
      new Uint8ClampedArray(occlusion.data.length * 4),
      occlusion.size.x, occlusion.size.y, occlusion.size.z
    );
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.unpackAlignment = 1;
    super({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        lightmapIntensity: { value: intensity },
        lightmapOrigin: {
          value: (new Vector3()).copy(occlusion.origin).multiplyScalar(scale || 1),
        },
        lightmapSize: { value: (new Vector3()).copy(occlusion.size).multiplyScalar(scale || 1) },
        lightmapTexture: { value: texture },
        lightChannel0Color: { value: (new Color()).copy(channels[0]) },
        lightChannel1Color: { value: (new Color()).copy(channels[1]) },
        lightChannel2Color: { value: (new Color()).copy(channels[2]) },
        lightChannel3Color: { value: (new Color()).copy(channels[3]) },
      },
      vertexShader: vertexShader
        .replace('#include <clipping_planes_pars_vertex>', [
          '#include <clipping_planes_pars_vertex>',
          'uniform vec3 lightmapSize;',
          'uniform vec3 lightmapOrigin;',
          'varying vec3 lightmapPosition;',
        ].join('\n'))
        .replace('#include <clipping_planes_vertex>', [
          '#include <clipping_planes_vertex>',
          'vec4 worldPos = vec4(position, 1.0);',
          '#ifdef USE_INSTANCING',
          'worldPos = instanceMatrix * worldPos;',
          '#endif',
          'worldPos = modelMatrix * worldPos;',
          'lightmapPosition = (vec3(worldPos) - lightmapOrigin) / lightmapSize;',
        ].join('\n')),
      fragmentShader: fragmentShader
        .replace('#include <clipping_planes_pars_fragment>', [
          '#include <clipping_planes_pars_fragment>',
          'precision highp sampler3D;',
          'uniform sampler3D lightmapTexture;',
          'uniform vec3 lightChannel0Color;',
          'uniform vec3 lightChannel1Color;',
          'uniform vec3 lightChannel2Color;',
          'uniform vec3 lightChannel3Color;',
          'uniform float lightmapIntensity;',
          'varying vec3 lightmapPosition;',
        ].join('\n'))
        .replace('vec3 outgoingLight = reflectedLight.indirectDiffuse;', [
          'vec4 sampledLight = texture(lightmapTexture, lightmapPosition);',
          'vec3 coloredLight = saturate(lightChannel0Color * sampledLight.r + lightChannel1Color * sampledLight.g + lightChannel2Color * sampledLight.b + lightChannel3Color * sampledLight.a);',
          'vec3 outgoingLight = reflectedLight.indirectDiffuse + coloredLight * lightmapIntensity;',
        ].join('\n')),
      fog: true,
      vertexColors: true,
    });
    this.occlusion = occlusion;
    this.scale = scale;
  }

  update(channels) {
    const { occlusion, scale, uniforms } = this;
    const texture = uniforms.lightmapTexture.value;
    texture.image.data.fill(0);

    channels = channels.map((queue) => queue.map((position) => (
      position
        .clone()
        .sub(uniforms.lightmapOrigin.value)
        .divideScalar(scale)
        .floor()
    )));

    const maxLight = 15;
    const index = (
      channel,
      x, y, z
    ) => {
      const i = z * occlusion.size.y * occlusion.size.x + y * occlusion.size.x + x;
      if (~channel) {
        return i * 4 + channel;
      }
      return i;
    };
    const voxelNeighbors = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
    ];
    channels.forEach((queue, channel) => {
      queue.forEach(({ x, y, z }) => {
        texture.image.data[index(channel, x, y, z)] = maxLight;
      });
      while (queue.length) {
        const { x, y, z } = queue.shift();
        const light = texture.image.data[index(channel, x, y, z)];
        voxelNeighbors.forEach((offset) => {
          const nx = x + offset.x;
          const ny = y + offset.y;
          const nz = z + offset.z;
          if (
            nx < 0 || nx >= occlusion.size.x
            || ny < 0 || ny >= occlusion.size.y
            || nz < 0 || nz >= occlusion.size.z
          ) {
            return;
          }
          const ni = index(channel, nx, ny, nz);
          const nl = light - 1;
          if (texture.image.data[ni] >= nl) {
            return;
          }
          texture.image.data[ni] = nl;
          if (!occlusion.data[index(-1, nx, ny, nz)]) {
            queue.push({ x: nx, y: ny, z: nz });
          }
        });
      }
    });

    texture.needsUpdate = true;
  }
}

export default Lighting;
