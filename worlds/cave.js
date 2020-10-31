import ElevatorWorld from '../core/elevatorWorld.js';
import Lightmap from '../core/lightmap.js';
import {
  Euler,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
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
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Cave', offset: this.elevator.getOffset(player) })
        );
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
            this.physics.addKinematic(physics);
          });
        }),
      ])
        .then(([lightmap]) => {
          lightmap.material.uniforms.lightmapSize.value.copy(lightmap.size).multiplyScalar(0.5);
          lightmap.material.uniforms.lightmapOrigin.value.copy(lightmap.origin).multiplyScalar(0.5);
          lightmap.material.vertexColors = true;
  
          this.sphere = 0;
          this.spheres = new Spheres({ count: 100, material: lightmap.material });
          const matrix = new Matrix4();
          for (let i = 0; i < this.spheres.count; i += 1) {
            matrix.setPosition((Math.random() - 0.5) * 8, 8 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
            this.spheres.setMatrixAt(i, matrix);
          }
          this.physics.addMesh(this.spheres, 1);
          this.spheres.geometry = Spheres.geometries.model;
          this.add(this.spheres);
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      isOnElevator,
      physics,
      player,
      spheres,
    } = this;
    if (isOnElevator || !physics || !spheres) {
      return;
    }
    const controller = (
      player.desktopControls.buttons.primaryDown ? (
        player.desktopControls
      ) : (
        player.controllers.find(({ hand, buttons: { triggerDown } }) => (hand && triggerDown))
      )
    );
    if (controller) {
      const { sphere } = this;
      const { origin, direction } = controller.raycaster.ray;
      this.sphere = (this.sphere + 1) % spheres.count;
      physics.setMeshPosition(
        spheres,
        origin
          .clone()
          .addScaledVector(direction, 0.5),
        sphere
      );
      physics.applyImpulse(spheres, direction.clone().multiplyScalar(16), sphere);
    }
  }
}

Cave.display = 'Physics Cave';

export default Cave;
