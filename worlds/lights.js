import {
  Color,
  Euler,
  Matrix4,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Lighting from '../core/lighting.js';
import Lightmap from '../core/lightmap.js';
import Boxes from '../renderables/boxes.js';
import Orb from '../renderables/orb.js';
import Spheres from '../renderables/spheres.js';

class Lights extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0, 3.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, translocables } = scene;

    ambient.set('sounds/cave.ogg');

    Promise.all([
      models.load('models/lights.glb')
        .then((model) => {
          model.scale.setScalar(0.5);
          this.add(model);
          this.elevator.isOpen = true;
          return model;
        }),
      models.lightmap('models/lightsLightmap.json'),
      models.occlusion('models/lightsOcclusion.json'),
      Promise.all([
        scene.getPhysics(),
        models.physics('models/lightsPhysics.json', 0.5),
      ])
        .then(([physics, boxes]) => {
          this.physics = physics;
          boxes.forEach((box) => {
            translocables.push(box);
            this.physics.addMesh(box);
            this.add(box);
          });
        }),
    ])
      .then(([model, lightmap, occlusion]) => {
        scene.background = (new Color()).copy(lightmap.channels[3]);
        const lighting = new Lighting({
          channels: lightmap.channels,
          intensity: 0.75,
          occlusion,
          scale: 0.5,
        });
        const { map } = model.children[0].children[0].material;
        lighting.uniforms.map.value = map;
        lighting.map = map;
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = lighting;
          }
        });

        const cylinderAnimation = (offset) => (orb) => (animation) => {
          const step = Math.sin(animation.time * 1.5);
          const x = -3 + step * 4;
          const y = 3;
          const z = -8.5;
          const d = 1.5;
          const angle = Math.PI * 2 * step + offset;
          orb.position.set(
            x,
            y + Math.sin(angle) * d,
            z + Math.cos(angle) * d
          );
        };
        const upDownAnimation = (orb) => (animation) => {
          const step = Math.sin(animation.time * 1.5);
          orb.position.set(
            -4,
            3 - step * 2,
            -1.5
          );
        };
        const lights = [
          cylinderAnimation(0),
          cylinderAnimation(-Math.PI),
          upDownAnimation,
        ].map((animation, channel) => {
          const orb = new Orb(lightmap.channels[channel]);
          orb.animate = animation(orb);
          this.add(orb);
          return orb;
        });
        lighting.animate = (animation) => {
          lights.forEach((light) => light.animate(animation));
          lighting.update([[lights[0].position], [lights[1].position], [lights[2].position]]);
        };
        this.lighting = lighting;

        const material = new Lightmap({
          channels: lightmap.channels,
          intensity: 3,
          origin: lightmap.origin.clone().multiplyScalar(0.5),
          size: lightmap.size.clone().multiplyScalar(0.5),
          textures: [
            lightmap.texture,
            this.lighting.uniforms.lightmapTexture.value,
          ],
        });
        this.box = 0;
        this.sphere = 0;
        this.boxes = new Boxes({ count: 50, material });
        this.spheres = new Spheres({ count: 50, material });
        const matrix = new Matrix4();
        for (let i = 0, l = this.boxes.count + this.spheres.count; i < l; i += 1) {
          matrix.setPosition(
            (Math.random() - 0.5) * 8,
            3 + (Math.random() - 0.5) * 2,
            -1 + (Math.random() - 0.5) * 4
          );
          if (i < this.boxes.count) {
            this.boxes.setMatrixAt(i, matrix);
          } else {
            this.spheres.setMatrixAt(i - this.boxes.count, matrix);
          }
        }
        this.physics.addMesh(this.boxes, 1);
        this.physics.addMesh(this.spheres, 1);
        this.add(this.boxes);
        this.add(this.spheres);
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      boxes,
      isOnElevator,
      lighting,
      physics,
      player,
      spheres,
    } = this;
    if (lighting) {
      lighting.animate(animation);
    }
    if (isOnElevator || !boxes || !spheres) {
      return;
    }
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({
      buttons,
      hand,
      isDesktop,
      raycaster,
    }) => {
      const launchBox = (hand && hand.handedness === 'left' && buttons.triggerDown) || (isDesktop && buttons.secondaryDown);
      const launchSphere = (hand && hand.handedness === 'right' && buttons.triggerDown) || (isDesktop && buttons.primaryDown);
      const { origin, direction } = raycaster.ray;
      if (launchBox || launchSphere) {
        const bodies = launchBox ? boxes : spheres;
        const index = launchBox ? this.box : this.sphere;
        if (launchBox) {
          this.box = (index + 1) % boxes.count;
        } else {
          this.sphere = (index + 1) % spheres.count;
        }
        physics.setMeshPosition(
          bodies,
          origin
            .clone()
            .addScaledVector(direction, 0.5),
          index
        );
        physics.applyImpulse(bodies, direction.clone().multiplyScalar(16), index);
      }
    });
  }
}

Lights.display = 'Lights!';

export default Lights;
