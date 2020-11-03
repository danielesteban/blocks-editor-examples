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
import Rain from '../renderables/rain.js';
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
    ambient.set([
      'sounds/rain.ogg',
      'sounds/sea.ogg',
    ]);
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

    const rain = new Rain({ anchor: player, heightmapScale: 0.5 });
    this.add(rain);
    this.rain = rain;

    models.load('models/island.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        model.traverse((child) => {
          if (child.isMesh) {
            rain.addToHeightmap(child);
          }
        });
        rain.reset();
        rain.visible = true;

        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Island', offset: this.elevator.getOffset(player) })
        );
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/islandPhysics.json', 0.5),
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

        this.sphere = 0;
        this.spheres = new Spheres({ count: 50 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition((Math.random() - 0.5) * 16, 8 + Math.random() * 8, (Math.random() - 0.5) * 16);
          this.spheres.setMatrixAt(i, matrix);
        }
        this.physics.addMesh(this.spheres, 1);
        this.add(this.spheres);
    });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      clouds,
      isOnElevator,
      physics,
      player,
      rain,
      spheres,
    } = this;
    clouds.animate(animation);
    Ocean.animate(animation);
    rain.animate(animation);
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

  onUnload() {
    const { rain } = this;
    rain.dispose();
  }
}

Island.display = 'Foggy Island';

export default Island;
