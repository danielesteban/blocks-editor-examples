import {
  Group,
  Vector3,
} from './three.js';
import Elevator from '../renderables/elevator.js';

// A template for worlds with an elevator

class ElevatorWorld extends Group {
  constructor({
    scene,
    offset,
    position,
    rotation,
  }) {
    super();

    const { models, player, translocables } = scene;
    this.player = player;
    
    const elevator = new Elevator({ models });
    elevator.position.copy(position);
    elevator.rotation.copy(rotation);
    elevator.scale.setScalar(0.25);
    translocables.push(elevator.translocables);
    this.add(elevator);
    this.elevator = elevator;

    const origin = new Vector3();
    elevator.updateMatrixWorld();
    if (offset) {
      elevator.localToWorld(origin.copy(offset.position));
      player.teleport(origin);
      player.rotate(elevator.rotation.y - offset.rotation);
    } else {
      elevator.getWorldPosition(origin).add(new Vector3(0, 0.5, 1.75));
      player.rotation.y = 0;
      player.teleport(origin);
    }
  }

  onAnimationTick({ delta, time }) {
    const { elevator, player } = this;
    elevator.animate(delta);
    this.isOnElevator = elevator.containsPoint(player.head.position);
    if (this.isOnElevator) {
      if (
        elevator.isOpen
        && (
          player.desktopControls.buttons.primaryDown
          || player.controllers.find(({ hand, buttons: { triggerDown } }) => (hand && triggerDown))
        )
      ) {
        elevator.isOpen = false;
      }
    }
  }
}

export default ElevatorWorld;
