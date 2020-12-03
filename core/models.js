import {
  BoxBufferGeometry,
  ClampToEdgeWrapping,
  DataTexture3D,
  GLTFLoader,
  Mesh,
  MeshBasicMaterial,
  LinearFilter,
  Vector3,
} from './three.js';

class Models {
  constructor() {
    this.loader = new GLTFLoader();
    this.bodies = new Map();
    this.models = new Map();
    this.lightmaps = new Map();
    this.occlusionmaps = new Map();
  }

  load(model) {
    const { loader, models } = this;
    return new Promise((resolve) => {
      let cache = models.get(model);
      if (!cache) {
        cache = {
          loading: true,
          promises: [resolve],
        };
        models.set(model, cache);
        loader.load(model, ({ scene: model }) => {
          cache.loading = false;
          cache.model = model;
          cache.promises.forEach((resolve) => resolve(model.clone()));
          delete cache.promises;
        });
      } else if (cache.loading) {
        cache.promises.push(resolve);
      } else {
        resolve(cache.model.clone());
      }
    });
  }

  lightmap(lightmap) {
    const { lightmaps } = this;
    return new Promise((resolve) => {
      let cache = lightmaps.get(lightmap);
      if (!cache) {
        cache = {
          loading: true,
          promises: [resolve],
        };
        lightmaps.set(lightmap, cache);
        fetch(lightmap)
          .then((res) => res.json())
          .then((lightmap) => {
            cache.loading = false;
            const texture = new DataTexture3D(
              new Uint8ClampedArray(atob(lightmap.data).split('').map((c) => c.charCodeAt(0))),
              lightmap.size.x, lightmap.size.y, lightmap.size.z
            );
            texture.minFilter = LinearFilter;
            texture.magFilter = LinearFilter;
            texture.unpackAlignment = 1;
            cache.lightmap = {
              channels: lightmap.channels,
              origin: new Vector3(lightmap.origin.x, lightmap.origin.y, lightmap.origin.z),
              size: new Vector3(lightmap.size.x, lightmap.size.y, lightmap.size.z),
              texture,
            };
            cache.promises.forEach((resolve) => resolve(cache.lightmap));
            delete cache.promises;
          });
      } else if (cache.loading) {
        cache.promises.push(resolve);
      } else {
        resolve(cache.lightmap);
      }
    });
  }

  occlusion(occlusion) {
    const { occlusionmaps } = this;
    return new Promise((resolve) => {
      let cache = occlusionmaps.get(occlusion);
      if (!cache) {
        cache = {
          loading: true,
          promises: [resolve],
        };
        occlusionmaps.set(occlusion, cache);
        fetch(occlusion)
          .then((res) => res.json())
          .then((occlusion) => {
            cache.loading = false;
            cache.occlusion = {
              data: new Uint8ClampedArray(atob(occlusion.data).split('').map((c) => c.charCodeAt(0))),
              origin: occlusion.origin,
              size: occlusion.size,
            };
            cache.promises.forEach((resolve) => resolve(cache.occlusion));
            delete cache.promises;
          });
      } else if (cache.loading) {
        cache.promises.push(resolve);
      } else {
        resolve(cache.occlusion);
      }
    });
  }

  physics(physics, scale = 1) {
    if (!Models.physicsMaterial) {
      Models.physicsMaterial = new MeshBasicMaterial({ visible: false });
    }
    const { bodies } = this;
    return new Promise((resolve) => {
      let cache = bodies.get(physics);
      if (!cache) {
        cache = {
          loading: true,
          promises: [resolve],
        };
        bodies.set(physics, cache);
        fetch(physics)
          .then((res) => res.json())
          .then((physics) => {
            cache.loading = false;
            cache.physics = physics.map(([position, size]) => {
              const mesh = new Mesh(
                new BoxBufferGeometry(size[0] * scale, size[1] * scale, size[2] * scale),
                Models.physicsMaterial
              );
              mesh.position.set(
                (position[0] + size[0] * 0.5) * scale,
                (position[1] + size[1] * 0.5) * scale,
                (position[2] + size[2] * 0.5) * scale
              );
              return mesh;
            });
            cache.promises.forEach((resolve) => resolve(cache.physics.map((box) => box.clone())));
            delete cache.promises;
          });
      } else if (cache.loading) {
        cache.promises.push(resolve);
      } else {
        resolve(cache.physics.map((box) => box.clone()));
      }
    });
  }
}

export default Models;
