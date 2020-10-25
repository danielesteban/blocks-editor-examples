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
    } else {
      elevator.getWorldPosition(origin).add(new Vector3(0, 0.5, 1.75));
    }
    player.teleport(origin);
    if (offset) {
      player.rotate(elevator.rotation.y - offset.rotation);
    }
  }

  onAnimationTick({ delta, time }) {
    const { elevator, player } = this;
    elevator.animate(delta);
    this.isOnElevator = elevator.containsPoint(player.head.position);
    if (this.isOnElevator) {
      player.controllers.forEach((controller) => {
        const {
          buttons: { triggerDown },
          hand,
        } = controller;
        if (!hand || !triggerDown || !elevator.isOpen) {
          return;
        }
        elevator.isOpen = false;
      });
    }
  }
}

export default ElevatorWorld;
