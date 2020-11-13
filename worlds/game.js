import ElevatorWorld from '../core/elevatorWorld.js';
import Peers from '../core/peers.js';
import {
  Color,
  Euler,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Pixels from '../renderables/pixels.js';

class Game extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0.5, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x6699AA);
    scene.enableRotation = false;

    const players = 4;
    const size = 9 / players;
    const displays = [...Array(players)].map((v, i) => {
      const display = new Pixels({ width: 2, height: 4, resolution: 5 });
      display.position.set(
        (
          (size * 0.5) + (size * Math.floor(i / 2))
        ) * (i % 2 === 1 ? 1 : -1),
        5.5,
        -12.975
      );
      this.add(display);
      return display;
    });
    this.displays = displays;

    const peers = new Peers({
      onUpdate: ({ displays: state }) => {
        state.forEach((state, display) => (
          displays[display].update(state)
        ));
      },
      player,
      room: 'wss://train.gatunes.com/rooms/Game',
    });
    this.add(peers);
    this.peers = peers;

    models.load('models/game.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });
        this.add(model);
        this.elevator.isOpen = true;
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const { isOnElevator, peers, player } = this;
    peers.animate(animation);
    if (isOnElevator || !peers.server) {
      return;
    }
    player.controllers.forEach((controller) => {
      const {
        buttons: {
          gripDown,
          primaryDown,
          triggerDown,
        },
        hand,
      } = controller;
      if (!hand) {
        return;
      }
      if (gripDown || primaryDown || triggerDown) {
        let move;
        if (hand.handedness === 'left' && primaryDown) {
          move = -1;
        }
        if (hand.handedness === 'right' && primaryDown) {
          move = 1;
        }
        let rotate;
        if (gripDown || triggerDown) {
          rotate = 1;
        }
        peers.server.send(JSON.stringify({
          type: 'INPUT',
          data: {
            move,
            rotate,
          },
        }));
      }
    });
  }

  onUnload() {
    const { displays, peers } = this;
    displays.forEach((display) => display.dispose());
    peers.disconnect();
  }
}

Game.display = 'Gameroom';
Game.isMultiplayer = true;

export default Game;
