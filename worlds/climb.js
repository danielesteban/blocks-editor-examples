import {
  Box3,
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

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.025);

    const birds = new Birds({ anchor: player });
    this.add(birds);
    this.birds = birds;

    const clouds = new Clouds();
    clouds.position.y = 64;
    this.add(clouds);
    this.clouds = clouds;

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
        this.collision = boxes.map((box) => {
          translocables.push(box);
          this.add(box);
          const collision = new Box3();
          return collision.setFromObject(box);
        });
      });

    this.aux = {
      box: new Box3(),
      vector: new Vector3(),
    };
    this.isClimbing = [false, false];
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      aux,
      birds,
      clouds,
      collision,
      isClimbing,
      isOnElevator,
      peers,
      player,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    Ocean.animate(animation);
    peers.animate(animation);
    if (isOnElevator || !collision) {
      return;
    }
    let climbing = 0;
    aux.vector.set(0, 0, 0);
    player.controllers.forEach(({ hand, buttons, physics, worldspace }, i) => {
      if (!hand) {
        return;
      }
      if (!isClimbing[i] && buttons.triggerDown) {
        aux.box.setFromObject(physics);
        if (collision.find((box) => box.intersectsBox(aux.box))) {
          isClimbing[i] = true;
        }
      }
      if (isClimbing[i]) {
        if (buttons.triggerUp) {
          isClimbing[i] = false;
        } else {
          aux.vector.add(worldspace.movement);
          climbing += 1;
        }
      }
    });
    if (climbing) {
      player.move(
        aux.vector.divideScalar(climbing).negate()
      );
    }
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
