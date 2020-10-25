import { Box3, Group, Vector3 } from '../core/three.js';
import Display from './display.js';

class Train extends Group {
  constructor({ models, isOpen = false }) {
    super();
    this.aux = new Box3();
    this.bounds = new Box3();
    this.isOpen = isOpen;
    this.translocables = [];
    models.lightmap('models/tunnelLightmap.json')
      .then((lightmap) => {
        lightmap.material.uniforms.lightmapBlending.value = 0.7;
        lightmap.material.uniforms.lightmapIntensity.value = 3;
        lightmap.material.uniforms.lightmapSize.value.copy(lightmap.size).multiplyScalar(0.25);
        lightmap.material.vertexColors = true;
        this.lightmap = {
          origin: lightmap.origin,
          materials: [],
        };

        const swapMaterials = (child, materials) => {
          const { material: { map, transparent } } = child;
          let material;
          if (transparent) {
            material = materials.transparent;
            if (!material) {
              material = lightmap.material.clone();
              material.transparent = true;
              material.uniforms.map.value = map;
              material.map = map;
              materials.transparent = material;
            }
          } else {
            material = materials.opaque;
            if (!material) {
              material = lightmap.material.clone();
              material.uniforms.map.value = map;
              material.map = map;
              materials.opaque = material;
            }
          }
          child.material = material;
        };

        models.load('models/train.glb')
          .then((model) => {
            const materials = {};
            model.updateMatrixWorld();
            model.traverse((child) => {
              if (child.isMesh) {
                this.bounds.expandByObject(child);
                swapMaterials(child, materials);
                this.translocables.push(child);
              }
            });
            this.lightmap.materials.push(materials.opaque, materials.transparent);
            for (let i = 0; i < 2; i += 1) {
              const display = new Display({
                material: lightmap.material.clone(),
                materials: this.lightmap.materials,
                models,
                swapMaterials,
              });
              display.position.set(0, 13, i === 0 ? -21.65 : 25.65);
              if (i === 1) display.rotation.y = Math.PI;
              model.add(display);
            }
            this.add(model);
          });

        models.load('models/trainDoor.glb')
          .then((model) => {
            const materials = {};
            model.traverse((child) => {
              if (child.isMesh) {
                swapMaterials(child, materials);
              }
            });
            this.lightmap.materials.push(materials.opaque, materials.transparent);
            this.doors = [
              { open: -3.75, closed: -1.5 },
              { open: 3.75, closed: 1.5 },
            ].map((animation, i) => {
              const door = model.clone();
              door.animation = animation;
              door.position.set(4.25, 0, animation[isOpen ? 'open' : 'closed']);
              door.scale.set(0.5, 1, 1);
              door.traverse((child) => {
                if (child.isMesh) {
                  this.translocables.push(child);
                }
              });
              this.add(door);
              return door;
            });
          });
      });
  }

  animate(delta) {
    const { isOpen, doors } = this;
    if (!doors) {
      return;
    }
    doors.forEach(({ animation, position }) => {
      let diff;
      if (isOpen && position.z != animation.open) {
        diff = animation.open - position.z;
      }
      if (!isOpen && position.z != animation.closed) {
        diff = animation.closed - position.z;
      }
      if (diff) {
        const step = delta * 2;
        position.z += Math.min(Math.max(diff, -step), step);
      }
    });
  }

  containsPoint(point) {
    const { aux, bounds, matrixWorld } = this;
    aux.copy(bounds).applyMatrix4(matrixWorld);
    return aux.containsPoint(point);
  }

  setDisplay(text) {
    Display.update(text);
  }
}

export default Train;
