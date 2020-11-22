import {
  Color,
  Euler,
  FogExp2,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Peers from '../core/peers.js';
import Birds from '../renderables/birds.js';
import Clouds from '../renderables/clouds.js';
import Ocean from '../renderables/ocean.js';

class Climb extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0, 3.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, climbables, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.025);

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    const ocean = new Ocean();
    ocean.position.y = 0.125;
    this.add(ocean);

    const peers = new Peers({
      player,
      room: 'wss://train.gatunes.com/rooms/Climb',
    });
    this.add(peers);
    this.peers = peers;

    models.load('models/climb.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);

        this.elevator.isOpen = true;
      });

    models.physics('models/climbPhysics.json', 0.5)
      .then((boxes) => {
        boxes.forEach((box) => {
          climbables.push(box);
          translocables.push(box);
          this.add(box);
        });
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      birds,
      clouds,
      peers,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    Ocean.animate(animation);
    peers.animate(animation);
  }

  onUnload() {
    const { birds, peers } = this;
    birds.dispose();
    peers.disconnect();
  }
}

Climb.display = 'Climber\'s Delight';
Climb.isMultiplayer = true;

export default Climb;
