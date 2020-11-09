import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Group,
  Matrix4,
  Quaternion,
  Vector3,
} from '../core/three.js';
import Clouds from '../renderables/clouds.js';
import Explosion from '../renderables/explosion.js';
import Spheres from '../renderables/spheres.js';
import Trigger from '../renderables/trigger.js';

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

    const clouds = new Clouds();
    clouds.position.y = 64;
    this.add(clouds);
    this.clouds = clouds;

    const explosions = [...Array(5)].map(() => {
      const explosion = new Explosion({ sfx });
      this.add(explosion);
      return explosion;
    });
    this.explosions = explosions;

    models.load('models/hinges.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
  
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Hinges', offset: this.elevator.getOffset(player) })
        );
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/hingesPhysics.json', 0.5),
      models.load('models/hingesDoor.glb'),
    ])
      .then(([physics, boxes, doorModel]) => {
        this.physics = physics;
        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });
        player.controllers.forEach(({ physics }) => {
          this.physics.addMesh(physics, 0, { isKinematic: true });
        });

        const door = new Group();
        door.physics = {
          shape: 'box',
          width: 0.9,
          height: 2.4,
          depth: 0.125,
        };
        door.position.set(0, 1.75, -1.25);
        const model = doorModel.children[0];
        model.position.set(-0.5, -1.75, -0.0625);
        model.scale.set(0.5, 0.5, 0.125);
        // const doorDebug = new Trigger(0.9, 2.4, 0.125);
        // door.add(doorDebug);
        door.add(model);
        this.add(door);
        this.physics.addMesh(door, 5);
        for (let i = 0; i < 2; i += 1) {
          const y = 0.5 * (i === 0 ? -1 : 1);
          this.physics.addConstraint(door, {
            type: 'hinge',
            origin: new Vector3(-0.4, y, 0),
            rotation: (new Quaternion()).setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 0.5),
          });
        }

        for (let i = 0; i < 4; i += 1) {
          const trigger = new Trigger(1, 1, 0.1);
          trigger.material = trigger.material.clone();
          trigger.position.set(-6 + 4 * i, 2.95, -2);
          trigger.onContact = (({ mesh, index, point }) => {
            if (mesh === this.spheres) {
              const color = new Color();
              this.spheres.getColorAt(index, color);
              trigger.material.color = color;
              const explosion = explosions.find(({ sound, visible }) => (!visible && (!sound || !sound.isPlaying)));
              if (explosion) {
                explosion.detonate({
                  color,
                  filter: 'highpass',
                  position: point,
                  scale: 0.1,
                });
              }
              physics.setMeshPosition(
                this.spheres,
                new Vector3((Math.random() - 0.5) * 12, 1, (Math.random() - 0.5) * 2),
                index
              );
            }
          });
          this.add(trigger);
          this.physics.addMesh(trigger, 2, { isTrigger: true });
          this.physics.addConstraint(trigger, {
            type: 'hinge',
            origin: new Vector3(0, 0.5, 0),
            rotation: (new Quaternion()).setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * -0.5)
          });
        }

        this.sphere = 0;
        this.spheres = new Spheres({ count: 50 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition((Math.random() - 0.5) * 12, 4 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3 - 2);
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
      explosions,
      isOnElevator,
      physics,
      player,
      spheres,
    } = this;
    clouds.animate(animation);
    explosions.forEach((explosion) => explosion.animate(animation));
    if (isOnElevator || !physics || !spheres) {
      return;
    }
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({ buttons, hand, isDesktop, raycaster }) => {
      if ((hand && buttons.triggerDown) || (isDesktop && buttons.primaryDown)) {
        const { sphere } = this;
        const { origin, direction } = raycaster.ray;
        this.sphere = (this.sphere + 1) % spheres.count;
        physics.setMeshPosition(
          spheres,
          origin
            .clone()
            .addScaledVector(direction, 0.5),
          sphere
        );
        physics.applyImpulse(spheres, direction.clone().multiplyScalar(12), sphere);
      }
    });
  }
}

Hinges.display = 'Hinge Testing';

export default Hinges;