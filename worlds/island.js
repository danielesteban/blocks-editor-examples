import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Clouds from '../renderables/clouds.js';
import Ocean from '../renderables/ocean.js';
import Rain from '../renderables/rain.js';

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

    // This scene has a lot of vegetation (cross block model).
    // Here it uses the physics boxes instead of the model chunks as the translocables
    // because the physics boxes have all the vegetation faces excluded.
    models.physics('models/islandPhysics.json', 0.5)
      .then((boxes) => (
        boxes.forEach((box) => {
          translocables.push(box);
          this.add(box);
        })
      ));
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const { clouds, rain } = this;
    clouds.animate(animation);
    Ocean.animate(animation);
    rain.animate(animation);
  }

  onUnload() {
    const { rain } = this;
    rain.dispose();
  }
}

Island.display = 'Foggy Island';

export default Island;
