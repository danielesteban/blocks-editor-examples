import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Clouds from '../renderables/clouds.js';
import Ocean from '../renderables/ocean.js';

class Island extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 6.5, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.04);

    const clouds = new Clouds();
    clouds.position.set(0, 64, 0);
    clouds.scale.set(10, 1, 10);
    this.add(clouds);
    this.clouds = clouds;

    const ocean = new Ocean();
    ocean.position.y = 3.725;
    this.add(ocean);

    models.load('models/island.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });
        this.add(model);

        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Island', offset: this.elevator.getOffset(player) })
        );
      });
  }

  onAnimationTick(animation) {
    Ocean.animate(animation);
    super.onAnimationTick(animation);
    const { clouds } = this;
    clouds.animate(animation);
  }
}

Island.display = 'Foggy Island';

export default Island;
