import ElevatorWorld from '../core/elevatorWorld.js';
import {
  BoxBufferGeometry,
  Color,
  Euler,
  FogExp2,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from '../core/three.js';
import Cannon from '../renderables/cannon.js';
import Clouds from '../renderables/clouds.js';
import Explosion from '../renderables/explosion.js';
import Paddle from '../renderables/paddle.js';
import Scoreboard from '../renderables/scoreboard.js';
import Spheres from '../renderables/spheres.js';
import Trigger from '../renderables/trigger.js';

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

    this.auxColor = new Color();
    this.auxVector = new Vector3();

    this.cannon = new Cannon();
    this.cannon.position.set(0, 1, -10);
    this.add(this.cannon);

    const clouds = new Clouds();
    clouds.position.set(0, 64, 0);
    clouds.scale.set(10, 1, 10);
    this.add(clouds);
    this.clouds = clouds;

    this.explosions = [...Array(5)].map(() => {
      const explosion = new Explosion();
      this.add(explosion);
      return explosion;
    });

    this.scoreboards = [...Array(2)].map((v, i) => {
      const scoreboard = new Scoreboard({ name: i === 0 ? 'CPU' : 'P1' });
      scoreboard.position.set(-3 + i * 6, 4.5, -11.49);
      scoreboard.scale.set(3, 3, 1);
      this.add(scoreboard);
      return scoreboard;
    });

    const onContact = (scoreboard) => ({ mesh, index, point }) => {
      const { scoreboards, spheres } = this;
      if (mesh === spheres) {
        this.destroySphere({ index, point });
        scoreboards[scoreboard].inc(1);
      }
    };

    const goal = new Trigger(4, 2, 0.125);
    goal.position.set(0, 2, 8.75);
    goal.onContact = onContact(0);
    this.add(goal);
    this.goal = goal;

    const paddles = ['left', 'right'].map((handedness) => {
      const joint = new Group();
      joint.rotation.set(Math.PI * -0.5, 0, 0);
      const paddle = new Paddle();
      paddle.onContact = onContact(1);
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
          scene.load('Metro', { destination: 'Court', offset: this.elevator.getOffset(player) })
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

        this.physics.addMesh(goal, 0, { isTrigger: true, noContactResponse: true });
        paddles.forEach((paddle) => {
          this.physics.addMesh(paddle, 0, { isKinematic: true, isTrigger: true, noContactResponse: true });
        });

        this.timer = 0;
        this.sphere = 0;
        this.spheres = new Spheres({ count: 20 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition(0, -100 + i, 0);
          this.spheres.setMatrixAt(i, matrix);
        }
        this.physics.addMesh(this.spheres, 1);
        this.add(this.spheres);
    });
  }

  destroySphere({ index, point }) {
    const { auxColor, auxVector, explosions, physics, spheres } = this;
    const explosion = explosions.find(({ visible }) => (!visible));
    if (explosion) {
      auxColor.fromBufferAttribute(spheres.instanceColor, index);
      explosion.detonate({
        color: auxColor,
        position: point,
        scale: 0.1,
      });
    }
    physics.setMeshPosition(
      spheres,
      auxVector.set(0, -100, 0),
      index
    );
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      cannon,
      clouds,
      explosions,
      physics,
      player,
      spheres,
      timer,
    } = this;
    cannon.animate(animation);
    clouds.animate(animation);
    explosions.forEach((explosion) => explosion.animate(animation));
    if (
      !physics || !spheres
      || timer > animation.time - 2
    ) {
      return;
    }
    this.timer = animation.time;
    const { sphere } = this;
    this.sphere = (this.sphere + 1) % spheres.count;
    const { origin, direction } = cannon.getShot();
    physics.setMeshPosition(
      spheres,
      origin,
      sphere
    );
    physics.applyImpulse(
      spheres,
      direction.multiplyScalar(14),
      sphere
    );
  }

  onUnload() {
    const { goal, scoreboards } = this;
    goal.dispose();
    scoreboards.forEach((scoreboard) => scoreboard.dispose());
  }
}

Court.display = 'Sports!';

export default Court;
