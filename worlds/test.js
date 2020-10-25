import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Ocean from '../renderables/ocean.js';

class Test extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, -0.25, 4),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x110033);
    scene.fog = new FogExp2(scene.background.getHex(), 0.015);

    const ocean = new Ocean();
    ocean.position.y = -0.125;
    ocean.rotation.y = Math.PI * 0.3;
    this.add(ocean);

    models.load('models/test.glb')
      .then((test) => {
        test.scale.setScalar(0.25);
        test.position.set(0, -0.25, 0);
        test.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });
        this.add(test);

        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Test', offset: this.elevator.getOffset(player) })
        );
      });
  }

  onAnimationTick(animation) {
    Ocean.animate(animation);
    super.onAnimationTick(animation);
  }
}

Test.display = 'Test Scene';

export default Test;
