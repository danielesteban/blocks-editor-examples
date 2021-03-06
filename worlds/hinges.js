import {
  Color,
  Euler,
  FogExp2,
  Matrix4,
  Quaternion,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Birds from '../renderables/birds.js';
import Box from '../renderables/box.js';
import Boxes from '../renderables/boxes.js';
import Clouds from '../renderables/clouds.js';
import Door from '../renderables/door.js';
import Explosion from '../renderables/explosion.js';
import Rain from '../renderables/rain.js';
import Spheres from '../renderables/spheres.js';

class Hinges extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0, 3.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, sfx, translocables } = scene;
    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    const explosions = [...Array(5)].map(() => {
      const explosion = new Explosion({ sfx });
      this.add(explosion);
      return explosion;
    });
    this.explosions = explosions;

    const doors = [...Array(3)].reduce((doors, v, j) => {
      for (let i = 0; i < 2; i += 1) {
        const orientation = i === 0 ? 1 : -1;
        const door = new Door({
          limits: i === 0 ? { low: -Math.PI, high: 0 } : { low: 0, high: Math.PI },
          model: 'models/labDoor.glb',
          models,
          orientation,
        });
        door.position.set(-5 + j * 5 + 0.5 * -orientation, 1.75, -4);
        translocables.push(door.translocables);
        this.add(door);
        doors.push(door);
      }
      return doors;
    }, []);

    const rain = new Rain({ anchor: player, heightmapScale: 0.5 });
    rain.timer = 30 + Math.random() * 60;
    rain.animateStorm = (animation) => {
      rain.animate(animation);
      rain.timer -= animation.delta;
      if (rain.timer <= 0) {
        rain.visible = !rain.visible;
        ambient.set(rain.visible ? ['sounds/rain.ogg', 'sounds/forest.ogg'] : 'sounds/forest.ogg');
        rain.timer = 30 + Math.random() * 60;
      }
    };
    this.add(rain);
    this.rain = rain;

    models.load('models/lab.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        model.traverse((child) => {
          if (child.isMesh) {
            rain.addToHeightmap(child);
          }
        });
        rain.reset();

        this.elevator.isOpen = true;
      });

    models.load('models/forest.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        model.traverse((child) => {
          if (child.isMesh) {
            rain.addToHeightmap(child);
          }
        });
        rain.reset();
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/labPhysics.json', 0.5),
    ])
      .then(([physics, boxes]) => {
        this.physics = physics;
        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });

        doors.forEach((door) => {
          this.physics.addMesh(door, 5);
          this.physics.addConstraint(door, door.hinge);
        });

        this.isPicking = [false, false];
        const pivots = { left: new Vector3(0.05, 0, 0), right: new Vector3(-0.05, 0, 0) };
        player.controllers.forEach((controller, i) => {
          const matrix = new Matrix4();
          const inverse = new Matrix4();
          const vector = new Vector3();
          controller.physics.onContact = ({ mesh, index, point }) => {
            if (
              !this.isPicking[i]
              && (mesh === this.boxes || mesh === this.spheres)
              && controller.hand
              && controller.buttons.grip
            ) {
              mesh.getMatrixAt(index, matrix);
              inverse.getInverse(matrix);
              this.isPicking[i] = this.physics.addConstraint(controller.physics, {
                type: 'p2p',
                mesh,
                index,
                pivotInA: pivots[controller.hand.handedness],
                pivotInB: vector.copy(point).applyMatrix4(inverse),
              });
            }
          };
          this.physics.addMesh(controller.physics, 0, { isKinematic: true, isTrigger: true });
        });

        this.box = 0;
        this.sphere = 0;
        this.boxes = new Boxes({ count: 25 });
        this.spheres = new Spheres({ count: 25 });
        const matrix = new Matrix4();
        for (let i = 0, l = this.boxes.count + this.spheres.count; i < l; i += 1) {
          matrix.setPosition(
            (Math.random() - 0.5) * 12,
            1 + Math.random(),
            (Math.random() - 0.5) * 5
          );
          if (i < this.boxes.count) {
            this.boxes.setMatrixAt(i, matrix);
          } else {
            this.spheres.setMatrixAt(i - this.boxes.count, matrix);
          }
        }
        this.physics.addMesh(this.boxes, 1);
        this.physics.addMesh(this.spheres, 1);
        this.add(this.boxes);
        this.add(this.spheres);

        for (let i = 0; i < 4; i += 1) {
          const trigger = new Box(1, 1, 0.1);
          trigger.material = trigger.material.clone();
          trigger.material.opacity = 0.75;
          trigger.position.set(-6 + 4 * i, 2.95, -9.5);
          trigger.onContact = ({ mesh, index, point }) => {
            if (mesh === this.boxes || mesh === this.spheres) {
              const color = new Color();
              mesh.getColorAt(index, color);
              trigger.material.color = color;
              const explosion = explosions.find(({ sound, visible }) => (
                !visible && (!sound || !sound.isPlaying)
              ));
              if (explosion) {
                explosion.detonate({
                  color,
                  filter: 'highpass',
                  position: point,
                  scale: 0.1,
                });
              }
              physics.setMeshPosition(
                mesh,
                new Vector3((Math.random() - 0.5) * 12, 1, (Math.random() - 0.5) * 5),
                index
              );
            }
          };
          this.add(trigger);
          this.physics.addMesh(trigger, 2, { isTrigger: true });
          this.physics.addConstraint(trigger, {
            type: 'hinge',
            position: new Vector3(0, 0.5, 0),
            rotation: (new Quaternion()).setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * -0.5),
          });
        }
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      birds,
      boxes,
      clouds,
      explosions,
      isOnElevator,
      isPicking,
      physics,
      player,
      rain,
      spheres,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    explosions.forEach((explosion) => explosion.animate(animation));
    rain.animateStorm(animation);
    if (!physics) {
      return;
    }
    player.controllers.forEach(({ hand, buttons }, i) => {
      if (isPicking[i] && hand && buttons.gripUp) {
        physics.removeConstraint(isPicking[i]);
        isPicking[i] = false;
      }
    });
    if (isOnElevator) {
      return;
    }
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({
      buttons,
      hand,
      isDesktop,
      raycaster,
    }) => {
      const launchBox = (hand && hand.handedness === 'left' && buttons.triggerDown) || (isDesktop && buttons.secondaryDown);
      const launchSphere = (hand && hand.handedness === 'right' && buttons.triggerDown) || (isDesktop && buttons.primaryDown);
      const { origin, direction } = raycaster.ray;
      if (launchBox || launchSphere) {
        const bodies = launchBox ? boxes : spheres;
        const index = launchBox ? this.box : this.sphere;
        if (launchBox) {
          this.box = (index + 1) % boxes.count;
        } else {
          this.sphere = (index + 1) % spheres.count;
        }
        physics.setMeshPosition(
          bodies,
          origin
            .clone()
            .addScaledVector(direction, 0.5),
          index
        );
        physics.applyImpulse(bodies, direction.clone().multiplyScalar(16), index);
      }
    });
  }

  onUnload() {
    const { birds } = this;
    birds.dispose();
  }
}

Hinges.display = 'Hinges Lab';

export default Hinges;
