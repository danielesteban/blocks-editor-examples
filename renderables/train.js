import { Box3, Group } from '../core/three.js';
import Lightmap from '../core/lightmap.js';
import Display from './display.js';
import Map from './map.js';

class Train extends Group {
  constructor({ isOpen = false, models, stations }) {
    super();
    this.aux = new Box3();
    this.bounds = new Box3();
    this.isOpen = isOpen;
    this.pointables = [];
    this.translocables = [];
    Map.setStations(stations);
    models.lightmap('models/tunnelLightmap.json')
      .then((lightmap) => {
        const lightmapMaterial = new Lightmap({
          blending: 0.7,
          channels: lightmap.channels,
          intensity: 3,
          origin: lightmap.origin.clone().multiplyScalar(0.25),
          size: lightmap.size.clone().multiplyScalar(0.25),
          textures: [lightmap.texture],
        });
        this.lightmap = {
          origin: lightmap.origin,
          materials: [],
        };

        models.load('models/train.glb')
          .then((model) => {
            const materials = {};
            model.updateMatrixWorld();
            model.traverse((child) => {
              if (child.isMesh) {
                this.bounds.expandByObject(child);
                Lightmap.swapMaterials(child, lightmapMaterial, materials);
                this.translocables.push(child);
              }
            });
            this.lightmap.materials.push(materials.opaque, materials.blending);
            for (let i = 0; i < 2; i += 1) {
              const display = new Display({
                material: lightmapMaterial.clone(),
                materials: this.lightmap.materials,
                models,
                swapMaterials: (child, materials) => (
                  Lightmap.swapMaterials(child, lightmapMaterial, materials)
                ),
              });
              display.position.set(0, 12, i === 0 ? -21.65 : 25.65);
              if (i === 1) display.rotation.y = Math.PI;
              model.add(display);
            }
            const map = new Map({
              material: lightmapMaterial.clone(),
              materials: this.lightmap.materials,
            });
            map.position.set(7.99, 8, 6);
            map.rotation.y = Math.PI * -0.5;
            map.renderOrder = -1;
            this.pointables.push(map);
            model.add(map);
            this.add(model);
          });

        models.load('models/trainDoor.glb')
          .then((model) => {
            const materials = {};
            model.traverse((child) => {
              if (child.isMesh) {
                Lightmap.swapMaterials(child, lightmapMaterial, materials);
              }
            });
            this.lightmap.materials.push(materials.opaque, materials.blending);
            this.doors = [
              { open: -3.75, closed: -1.5 },
              { open: 3.75, closed: 1.5 },
            ].map((animation) => {
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
      if (isOpen && position.z !== animation.open) {
        diff = animation.open - position.z;
      }
      if (!isOpen && position.z !== animation.closed) {
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

  setMap(station, progress, peers) {
    Map.update(station, progress, peers);
  }
}

export default Train;
