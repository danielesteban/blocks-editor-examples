import {
  Color,
  Euler,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Performance from '../renderables/performance.js';

class Concert extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0.5, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { models, translocables } = scene;
    scene.background = new Color(0x336699);

    const performance = new Performance({
      members: 2,
      key: 0x00d800,
      source: 'videos/zapatillaBrothers.webm',
    });
    performance.position.set(0, 3, -13.25);
    this.add(performance);
    this.performance = performance;

    models.load('models/concert.glb')
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
    const { performance, player } = this;
    performance.update(player.head.position);
  }

  onUnload() {
    const { performance } = this;
    performance.dispose();
  }

  resumeAudio() {
    const { performance } = this;
    performance.resume();
  }
}

Concert.display = 'Zapatilla brothers';

export default Concert;
