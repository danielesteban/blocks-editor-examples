import {
  Color,
  Euler,
  FogExp2,
  Matrix4,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Birds from '../renderables/birds.js';
import Cannon from '../renderables/cannon.js';
import Clouds from '../renderables/clouds.js';
import Pad from '../renderables/pad.js';
import Spheres from '../renderables/spheres.js';

class Sequencer extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0, 3.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { models, player, sfx, translocables } = scene;
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);

    this.bpm = 90;
    const intervals = [
      [2, 1, 2, 2, 1, 2], // Aeolian
      [1, 2, 2, 1, 2, 2], // Locrian
      [2, 2, 1, 2, 2, 2], // Ionian
      [2, 1, 2, 2, 2, 1], // Dorian
      [1, 2, 2, 2, 1, 2], // Phrygian
      [2, 2, 2, 1, 2, 2], // Lydian
      [2, 2, 1, 2, 2, 1], // Mixolydian
    ][Math.floor(Math.random() * 7)];
    const root = 6 + Math.floor(Math.random() * 12);
    const notes = [root];
    for (let i = 0, l = intervals.length; i < l; i += 1) {
      notes.push(notes[notes.length - 1] + intervals[i]);
    }
    notes.push(root + 12);
    this.pads = [
      ...[
        'sounds/kick.ogg',
        'sounds/snare.ogg',
        'sounds/hihat.ogg',
      ].map((sample, i) => {
        const pad = new Pad({
          listener: player.head,
          note: i,
          sample,
          sfx,
        });
        pad.position.set(-1.5 + i * 1.5, 4.5, -11.75);
        this.add(pad);
        return pad;
      }),
      ...[0, 1].reduce((pads, octave) => {
        notes.forEach((note, i) => {
          const pad = new Pad({
            listener: player.head,
            note: (octave * 12) + note,
          });
          pad.position.set(
            (octave === 0 ? -5.5 : 1) + (i % 4) * 1.5,
            i > 3 ? 1.5 : 3,
            -11.75
          );
          this.add(pad);
          pads.push(pad);
        });
        return pads;
      }, []),
    ];

    this.cannons = [
      [3, 0, 8],
      [8, 1, 2],
      [0, 0, 8],
      [1, 4, 8],
      [2, 2, 4],
      [13, 2, 8],
      [16, 3, 4],
    ].map(([target, offset, rate], i) => {
      const cannon = new Cannon({ models });
      cannon.position.set(-6 + i * 2, 1, -4);
      target = this.pads[target];
      cannon.lookAt(target.position.x, cannon.position.y, target.position.z);
      if (target.position.y === 4.5) {
        cannon.shaft.rotation.x = Math.PI * -0.17;
      } else if (target.position.y === 3) {
        cannon.shaft.rotation.x = Math.PI * -0.112;
      } else {
        cannon.shaft.rotation.x = Math.PI * -0.05;
      }
      cannon.enabled = true;
      cannon.offset = offset;
      cannon.rate = rate;
      this.add(cannon);
      return cannon;
    });

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    models.load('models/sequencer.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);

        this.elevator.isOpen = true;
      });

    models.load('models/forest.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/sequencerPhysics.json', 0.5),
    ])
      .then(([physics, boxes]) => {
        this.physics = physics;
        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });

        player.controllers.forEach((controller) => {
          this.physics.addMesh(controller.physics, 0, { isKinematic: true });
        });

        this.cannons.forEach((cannon) => {
          this.physics.addMesh(cannon, 0, { isKinematic: true });
        });

        this.pads.forEach((pad) => {
          this.physics.addMesh(pad, 0, { isTrigger: true });
        });

        this.sphere = 0;
        this.spheres = new Spheres({ count: 32 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition(0, -100 - i, 0);
          this.spheres.setMatrixAt(i, matrix);
        }
        this.physics.addMesh(this.spheres, 1);
        this.add(this.spheres);
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      birds,
      bpm,
      cannons,
      clouds,
      isOnElevator,
      pads,
      physics,
      player,
      spheres,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    pads.forEach((pad) => pad.animate(animation));
    if (isOnElevator || !physics || !spheres) {
      return;
    }
    const sequence = Math.floor((animation.time / (60 / (bpm * 4))) % 32);
    if (this.sequence !== sequence) {
      this.sequence = sequence;
      cannons.forEach((cannon) => {
        if (!cannon.enabled || (sequence + cannon.offset) % cannon.rate !== 0) {
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
          direction.multiplyScalar(16),
          sphere
        );
      });
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
        physics.applyImpulse(spheres, direction.clone().multiplyScalar(16), sphere);
      }
    });
  }

  onUnload() {
    const { birds } = this;
    birds.dispose();
  }
}

export default Sequencer;
