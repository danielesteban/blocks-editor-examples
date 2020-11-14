import { Euler, Matrix4, Vector3 } from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Boxes from '../renderables/boxes.js';
import Spheres from '../renderables/spheres.js';

class Cave extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 11.5, 6.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/dark.ogg');
  
    models.load('models/cave.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
  
        this.elevator.isOpen = true;
      });

    Promise.all([
      models.lightmap('models/caveLightmap.json'),
      Promise.all([
        scene.getPhysics(),
        models.physics('models/cavePhysics.json', 0.5),
      ])
        .then(([physics, boxes]) => {
          this.physics = physics;
          boxes.forEach((box) => {
            translocables.push(box);
            this.physics.addMesh(box);
            this.add(box);
          });
          player.controllers.forEach(({ physics }) => {
            this.physics.addMesh(physics, 0, { isKinematic: true });
          });
        }),
      ])
        .then(([lightmap]) => {
          lightmap.material.uniforms.lightmapSize.value.copy(lightmap.size).multiplyScalar(0.5);
          lightmap.material.uniforms.lightmapOrigin.value.copy(lightmap.origin).multiplyScalar(0.5);
          lightmap.material.vertexColors = true;
  
          this.box = 0;
          this.sphere = 0;
          this.boxes = new Boxes({ count: 50, material: lightmap.material });
          this.spheres = new Spheres({ count: 50, material: lightmap.material });
          const matrix = new Matrix4();
          for (let i = 0, l = this.boxes.count + this.spheres.count; i < l; i += 1) {
            matrix.setPosition((Math.random() - 0.5) * 8, 8 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
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
      physics,
      player,
      spheres,
    } = this;
    if (isOnElevator || !physics || !spheres) {
      return;
    }
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({ buttons, hand, isDesktop, raycaster }) => {
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

Cave.display = 'Physics Cave';

export default Cave;
