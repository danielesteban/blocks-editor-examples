import {
  Box3,
  Color,
  Euler,
  FogExp2,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Birds from '../renderables/birds.js';
import Cannon from '../renderables/cannonPhysics.js';
import Clouds from '../renderables/clouds.js';
import Explosion from '../renderables/explosion.js';
import Ground from '../renderables/ground.js';
import Ocean from '../renderables/ocean.js';
import Spheres from '../renderables/spheres.js';

class Tower extends ElevatorWorld {
  constructor(scene, { offset }) {
    const boat = new Group();
    boat.angle = 0;
    boat.modelOffset = new Vector3(-4, -3, 0);
    boat.position.set(-48, 5, -48);
    boat.rotation.set(0, Math.PI * -0.75, 0);
    boat.rotation.order = 'YXZ';
    boat.updateMatrixWorld();

    super({
      scene,
      offset,
      position: boat.localToWorld(new Vector3(0, -0.5, 4.25)),
      rotation: new Euler(0, boat.rotation.y - Math.PI, 0),
    });

    const { ambient, models, player, sfx, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    const ground = new Ground(256, 256, 0xd3f531);
    this.add(ground);

    const ocean = new Ocean();
    ocean.position.y = 2.125;
    this.add(ocean);

    this.bpm = 100;

    const step = new Vector3();
    boat.onPhysicsStep = (delta) => {
      if (boat.position.x < -18) {
        const d = Math.min(delta * 0.5, 1 / 60);
        step.set(d, 0, d);
        boat.position.add(step);
        boat.updateWorldMatrix();
        this.elevator.position.add(step);
        if (!player.destination) {
          player.move(step);
        }
      } else {
        boat.cannons.forEach((cannon) => {
          cannon.disabled = true;
        });
        delete boat.onPhysicsStep;
      }
    };
    boat.cannons = [
      { position: new Vector3(-2, 0.5, -7.5) },
      { position: new Vector3(2, 0.5, -7.5) },
    ].map(({ position }, i) => {
      const cannon = new Cannon({
        levers: false,
        models,
        sfx,
        position: boat.localToWorld(position.clone()),
        offset: i * 0.5,
        pitch: Math.PI * 0.15,
        rate: 0.5,
        yaw: Math.PI * -0.75 + (Math.random() - 0.5) * 0.5,
      });
      cannon.impulse = 32;
      cannon.base.hinge = {
        type: 'hinge',
        friction: true,
        mesh: boat,
        pivotInA: new Vector3(0, 0, 0),
        pivotInB: position,
        axisInA: new Vector3(0, 1, 0),
        axisInB: new Vector3(0, 1, 0),
      };
      this.add(cannon);
      return cannon;
    });
    this.add(boat);

    this.cannons = [
      ...[
        { position: new Vector3(-4.5, 23.5, -7.5), yaw: Math.PI * 0.25 },
        { position: new Vector3(4.5, 23.5, -7.5), yaw: Math.PI * 0.3 },
        // { position: new Vector3(-4.5, 23.5, 7.5), yaw: Math.PI },
        // { position: new Vector3(4.5, 23.5, 7.5), yaw: Math.PI },
        { position: new Vector3(-7.5, 23.5, -4.5), yaw: Math.PI * 0.5 },
        // { position: new Vector3(7.5, 23.5, -4.5), yaw: Math.PI * -0.5 },
        { position: new Vector3(-7.5, 23.5, 4.5), yaw: Math.PI * 0.25 },
        // { position: new Vector3(7.5, 23.5, 4.5), yaw: Math.PI * -0.5 },
      ].map(({ position, yaw }) => {
        const cannon = new Cannon({
          levers: false,
          models,
          sfx,
          position,
          offset: Math.random(),
          pitch: Math.PI * -0.1,
          rate: Math.max(Math.random(), 0.2),
          yaw: yaw + Math.PI * (Math.random() - 0.5) * 0.1,
        });
        this.add(cannon);
        return cannon;
      }),
      ...boat.cannons,
    ];

    this.explosions = [...Array(25)].map(() => {
      const explosion = new Explosion({ sfx });
      this.add(explosion);
      return explosion;
    });

    models.load('models/boat.glb')
      .then((model) => {
        model.position.copy(boat.modelOffset);
        model.scale.setScalar(0.5);
        boat.add(model);
      });

    models.load('models/tower.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          if (child.isMesh && child.material.transparent) {
            child.material.alphaTest = 1;
            child.material.depthWrite = true;
            child.material.transparent = false;
          }
        });
        this.add(model);

        this.elevator.isOpen = true;
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/boatPhysics.json', 0.5),
      models.physics('models/towerIslandPhysics.json', 0.5),
      models.physics('models/towerPhysics.json', 0.5),
    ])
      .then(([physics, boatPhysics, islandPhysics, towerPhysics]) => {
        this.physics = physics;
        boat.physics = [];
        boatPhysics.forEach((box) => {
          box.position.add(boat.modelOffset);
          translocables.push(box);
          boat.add(box);
          boat.physics.push({
            shape: 'box',
            position: box.position,
            width: box.geometry.parameters.width,
            height: box.geometry.parameters.height,
            depth: box.geometry.parameters.depth,
          });
        });
        [...islandPhysics, ...towerPhysics].forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });
        this.physics.addMesh(ground);

        player.controllers.forEach((controller) => {
          this.physics.addMesh(controller.physics, 0, { isKinematic: true });
        });

        this.physics.addMesh(boat, 0, { isKinematic: true });

        this.cannons.forEach((cannon) => {
          this.physics.addMesh(cannon.base, 5);
          this.physics.addConstraint(cannon.base, cannon.base.hinge);
          this.physics.addMesh(cannon.shaft, 1);
          this.physics.addConstraint(cannon.base, cannon.shaft.hinge);
        });

        this.sphere = 0;
        this.spheres = new Spheres({ count: 50 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition(0, -100 - i, 0);
          this.spheres.setMatrixAt(i, matrix);
        }
        const color = new Color();
        const vector = new Vector3();
        this.spheres.onContact = ({ mesh, point, trigger }) => {
          if (mesh === this.spheres) {
            return;
          }
          const explosion = this.explosions.find(({ sound, visible }) => (
            !visible && (!sound || !sound.isPlaying)
          ));
          if (explosion) {
            explosion.detonate({
              color: this.spheres.getColorAt(trigger, color),
              filter: 'highpass',
              position: point,
              scale: 0.5,
            });
          }
          physics.setMeshPosition(
            this.spheres,
            vector.set(0, -100 - trigger, 0),
            trigger
          );
        };
        this.physics.addMesh(this.spheres, 1, { isTrigger: true });
        this.add(this.spheres);

        this.climbing = {
          box: new Box3(),
          collision: towerPhysics.map((box) => {
            const collision = new Box3();
            return collision.setFromObject(box);
          }),
          hands: [false, false],
          vector: new Vector3(),
        };
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      birds,
      bpm,
      cannons,
      climbing,
      clouds,
      explosions,
      physics,
      player,
      spheres,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    explosions.forEach((explosion) => explosion.animate(animation));
    Ocean.animate(animation);
    if (!physics) {
      return;
    }
    const sequence = Math.floor((animation.time / (60 / (bpm * 4))));
    if (this.sequence !== sequence) {
      this.sequence = sequence;
      cannons.forEach((cannon) => {
        if (cannon.disabled || (sequence + cannon.offset) % cannon.rate !== 0) {
          return;
        }
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
          direction.multiplyScalar(cannon.impulse || 24),
          sphere
        );
        cannon.playSound();
      });
    }
    let hands = 0;
    climbing.vector.set(0, 0, 0);
    player.controllers.forEach(({
      hand,
      buttons,
      physics,
      worldspace,
    }, i) => {
      if (!hand) {
        return;
      }
      if (!climbing.hands[i] && buttons.triggerDown) {
        climbing.box.setFromObject(physics);
        if (climbing.collision.find((box) => box.intersectsBox(climbing.box))) {
          climbing.hands[i] = true;
        }
      }
      if (climbing.hands[i]) {
        if (buttons.triggerUp) {
          climbing.hands[i] = false;
        } else {
          climbing.vector.add(worldspace.movement);
          hands += 1;
        }
      }
    });
    if (hands) {
      player.move(
        climbing.vector.divideScalar(hands).negate()
      );
    }
  }

  onUnload() {
    const { birds } = this;
    birds.dispose();
  }
}

Tower.display = 'Cannon Tower';
Tower.isWIP = true;

export default Tower;
