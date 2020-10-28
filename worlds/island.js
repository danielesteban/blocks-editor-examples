import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Clouds from '../renderables/clouds.js';
import Ocean from '../renderables/ocean.js';
import Spheres from '../renderables/spheres.js';

class Island extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 5, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.06);

    const clouds = new Clouds();
    clouds.position.set(0, 64, 0);
    clouds.scale.set(10, 1, 10);
    this.add(clouds);
    this.clouds = clouds;

    const ocean = new Ocean();
    ocean.position.y = 3.725;
    this.add(ocean);

    this.world = new Group();
    this.world.scale.setScalar(0.5);
    this.add(this.world);

    models.load('models/island.glb')
      .then((model) => {
        this.world.add(model);
  
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Island', offset: this.elevator.getOffset(player) })
        );
      });

      Promise.all([
        scene.getPhysics(),
        models.physics('models/islandPhysics.json'),
      ])
        .then(([physics, boxes]) => {
          this.physics = physics;
          boxes.forEach((box) => {
            translocables.push(box);
            this.physics.addMesh(box);
            this.world.add(box);
          });

          this.sphere = 0;
          this.spheres = new Spheres({ count: 50 });
          const matrix = new Matrix4();
          for (let i = 0; i < this.spheres.count; i += 1) {
            matrix.setPosition((Math.random() - 0.5) * 32, 16 + Math.random() * 16, (Math.random() - 0.5) * 32);
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
      clouds,
      isOnElevator,
      physics,
      player,
      spheres,
    } = this;
    clouds.animate(animation);
    Ocean.animate(animation);
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

Island.display = 'Foggy Island';

export default Island;
