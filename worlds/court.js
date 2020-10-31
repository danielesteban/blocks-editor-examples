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
import Paddle from '../renderables/paddle.js';
import Spheres from '../renderables/spheres.js';

class Court extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0.5, 11.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);

    const clouds = new Clouds();
    clouds.position.set(0, 64, 0);
    clouds.scale.set(10, 1, 10);
    this.add(clouds);
    this.clouds = clouds;

    const paddles = ['left', 'right'].map((handedness) => {
      const joint = new Group();
      joint.rotation.set(Math.PI * -0.5, 0, 0);
      const paddle = new Paddle();
      paddle.position.set(0, 0.625, -0.033);
      joint.add(paddle);
      player.attach(joint, handedness);
      return paddle;
    });

    models.load('models/court.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
  
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Island', offset: this.elevator.getOffset(player) })
        );
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/courtPhysics.json', 0.5),
    ])
      .then(([physics, boxes]) => {
        this.physics = physics;
        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });

        paddles.forEach((paddle) => {
          this.physics.addMesh(paddle, 0, { isKinematic: true });
        });

        this.timer = 0;
        this.sphere = 0;
        this.spheres = new Spheres({ count: 50 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition((Math.random() - 0.5) * 8, 1, (Math.random() - 0.5) * 8 - 8);
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
      physics,
      player,
      spheres,
      timer,
    } = this;
    clouds.animate(animation);
    if (
      !physics
      || !spheres
      || timer > animation.time - 2
    ) {
      return;
    }
    this.timer = animation.time;
    const { sphere } = this;
    this.sphere = (this.sphere + 1) % spheres.count;
    physics.setMeshPosition(
      spheres,
      new Vector3(0, 2, -8),
      sphere
    );
    physics.applyImpulse(
      spheres,
      new Vector3(
        (Math.random() - 0.5) * 2,
        7 + (Math.random() * 2),
        10
      ),
      sphere
    );
  }
}

Court.display = 'Sports!';

export default Court;
