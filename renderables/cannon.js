import { Group, Vector3 } from '../core/three.js';

class Cannon extends Group {
  constructor({ models, sfx }) {
    super();
    this.shaft = new Group();
    this.shaft.position.set(0, 0.75, -0.125);
    this.shaft.launchPoint = new Vector3(0, 0, 1.75);
    this.add(this.shaft);
    this.shot = {
      origin: new Vector3(),
      direction: new Vector3(),
    };
    models.load('models/cannon.glb')
      .then((model) => {
        const [base, shaft] = model.children;
        base.position.set(-0.5, 0, -0.5);
        base.scale.setScalar(0.125);
        this.add(base);
        shaft.position.set(-0.25, 0.25, -0.125);
        shaft.rotation.x = Math.PI * 0.5;
        shaft.scale.setScalar(0.125);
        this.shaft.add(shaft);
      });
    sfx.load('sounds/shot.ogg')
      .then((sound) => {
        sound.filter = sound.context.createBiquadFilter();
        sound.setFilter(sound.filter);
        sound.setRefDistance(2);
        this.add(sound);
        this.sound = sound;
      });
  }

  animate({ time }) {
    const { rotation, shaft } = this;
    rotation.y = Math.sin(time) * 0.1;
    shaft.rotation.x = Math.PI * -0.125 + Math.sin(time * 1.5) * 0.1;
  }

  getShot() {
    const { shaft, shot, sound } = this;
    shaft.localToWorld(shot.origin.copy(shaft.launchPoint));
    shaft.getWorldPosition(shot.direction);
    shot.direction.subVectors(shot.origin, shot.direction).normalize();
    return shot;
  }

  playSound() {
    const { sound } = this;
    if (sound && !sound.isPlaying && sound.context.state === 'running') {
      sound.filter.frequency.value = (Math.random() + 0.5) * 1000;
      sound.play();
    }
  }
}

export default Cannon;
