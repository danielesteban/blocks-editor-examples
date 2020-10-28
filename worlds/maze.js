import ElevatorWorld from '../core/elevatorWorld.js';
import Lightmap from '../core/lightmap.js';
import {
  Euler,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Spheres from '../renderables/spheres.js';

class Maze extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(9.5, 0.5, 9.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
  
    this.world = new Group();
    this.world.scale.setScalar(0.5);
    this.add(this.world);

    models.load('models/maze.glb')
      .then((model) => {
        this.world.add(model);
  
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Maze', offset: this.elevator.getOffset(player) })
        );
      });

    Promise.all([
      models.lightmap('models/mazeLightmap.json'),
      Promise.all([
        scene.getPhysics(),
        models.physics('models/mazePhysics.json'),
      ])
        .then(([physics, boxes]) => {
          this.physics = physics;
          boxes.forEach((box) => {
            translocables.push(box);
            this.physics.addMesh(box);
            this.world.add(box);
          });
        }),
      ])
        .then(([lightmap]) => {
          lightmap.material.uniforms.lightmapSize.value.copy(lightmap.size).multiply(this.world.scale);
          lightmap.material.uniforms.lightmapOrigin.value.copy(lightmap.origin).multiply(this.world.scale).add(this.world.position);
          lightmap.material.vertexColors = true;

          this.sphere = 0;
          this.spheres = new Spheres({ count: 100, material: lightmap.material });
          const matrix = new Matrix4();
          for (let i = 0; i < this.spheres.count; i += 1) {
            matrix.setPosition((Math.random() - 0.5) * 32, 16 + Math.random() * 2, (Math.random() - 0.5) * 32);
            this.spheres.setMatrixAt(i, matrix);
          }
          this.physics.addMesh(this.spheres, 1);
          this.spheres.geometry = Spheres.geometries.model;
          this.world.add(this.spheres);
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
      const { sphere, world } = this;
      const { origin, direction } = controller.raycaster.ray;
      this.sphere = (this.sphere + 1) % spheres.count;
      physics.setMeshPosition(
        spheres,
        world.worldToLocal(
          origin
            .clone()
            .addScaledVector(direction, 0.5)
        ),
        sphere
      );
      physics.applyImpulse(spheres, direction.clone().multiplyScalar(20), sphere);
    }
  }
}

Maze.display = 'Maze';

export default Maze;
