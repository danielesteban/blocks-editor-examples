import {
  Group,
  Matrix4,
  Quaternion,
  Vector3,
} from '../core/three.js';
// import Box from './box.js';
import Monitor from './monitor.js';

class Cannon extends Group {
  constructor({
    levers = true,
    models,
    sfx,
    position,
    offset = 0,
    pitch = 0,
    rate = 0,
    yaw = 0,
  }) {
    super();
    this.base = new Group();
    this.base.position.copy(position);
    this.base.physics = [
      {
        shape: 'box',
        position: new Vector3(0, -0.25, 0),
        width: 1,
        height: 0.5,
        depth: 1,
      },
      {
        shape: 'box',
        position: new Vector3(-0.375, 0.25, 0),
        width: 0.25,
        height: 0.5,
        depth: 1,
      },
      {
        shape: 'box',
        position: new Vector3(0.375, 0.25, 0),
        width: 0.25,
        height: 0.5,
        depth: 1,
      },
    ];
    // this.base.physics.forEach(({ position, width, height, depth }) => {
    //   const box = new Box(width, height, depth);
    //   box.position.copy(position);
    //   this.base.add(box);
    // });
    this.base.hinge = {
      type: 'hinge',
      friction: true,
      position: new Vector3(0, -0.5, 0),
      rotation: (new Quaternion()).setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * -0.5),
    };
    if (levers) {
      this.base.monitors = [...Array(2)].map((v, i) => {
        const monitor = new Monitor({
          title: i === 0 ? 'OFFSET' : 'RATE',
          value: i === 0 ? 0 : 'OFF',
        });
        monitor.position.set(0.375 * (i === 0 ? -1 : 1), 0.501, 0.35);
        monitor.rotation.set(Math.PI * -0.5, 0, 0);
        monitor.scale.set(0.1, 0.1, 1);
        this.base.add(monitor);
        return monitor;
      });
    }
    this.add(this.base);

    if (levers) {
      this.levers = [...Array(2)].map((v, i) => {
        const lever = new Group();
        lever.physics = [
          {
            shape: 'box',
            position: new Vector3(0, 0, 0),
            width: 0.05,
            height: 0.5,
            depth: 0.05,
          },
          {
            shape: 'box',
            position: new Vector3(0.05 * (i === 0 ? -1 : 1), 0.275, 0),
            width: 0.15,
            height: 0.05,
            depth: 0.05,
          },
        ];
        // lever.physics.forEach(({ position, width, height, depth }) => {
        //   const box = new Box(width, height, depth);
        //   box.position.copy(position);
        //   lever.add(box);
        // });
        lever.position.copy(position).add(new Vector3(0.51 * (i === 0 ? -1 : 1), 0.2, 0.35));
        lever.hinge = {
          type: 'hinge',
          friction: true,
          limits: { low: Math.PI * -0.2, high: 0 },
          mesh: lever,
          pivotInA: new Vector3(0.51 * (i === 0 ? -1 : 1), 0, 0.35),
          pivotInB: new Vector3(0, -0.2, 0),
          axisInA: new Vector3(1, 0, 0),
          axisInB: new Vector3(1, 0, 0),
        };
        this.add(lever);
        return lever;
      });
    } else {
      [
        { id: 'offset', normalized: offset, values: Cannon.offsets },
        { id: 'rate', normalized: rate, values: Cannon.rates },
      ].forEach(({ id, normalized, values }) => {
        this[id] = values[Math.round(normalized * (values.length - 1))];
      });
    }

    this.shaft = new Group();
    this.shaft.position.copy(position).add(new Vector3(0, 0.425, 0));
    this.shaft.physics = [
      {
        shape: 'box',
        position: new Vector3(0, 0, 0),
        width: 0.4,
        height: 0.4,
        depth: 1.5,
      },
      // Handle
      {
        shape: 'box',
        position: new Vector3(-0.075, 0, 0.775),
        width: 0.05,
        height: 0.05,
        depth: 0.05,
      },
      {
        shape: 'box',
        position: new Vector3(0.075, 0, 0.775),
        width: 0.05,
        height: 0.05,
        depth: 0.05,
      },
      {
        shape: 'box',
        position: new Vector3(0, 0, 0.825),
        width: 0.2,
        height: 0.05,
        depth: 0.05,
      },
    ];
    // this.shaft.physics.forEach(({ position, width, height, depth }) => {
    //   const box = new Box(width, height, depth);
    //   box.position.copy(position);
    //   this.shaft.add(box);
    // });
    this.shaft.hinge = {
      type: 'hinge',
      friction: true,
      mesh: this.shaft,
      pivotInA: new Vector3(0, 0.425, 0.125),
      pivotInB: new Vector3(0, 0, 0.125),
      axisInA: new Vector3(1, 0, 0),
      axisInB: new Vector3(1, 0, 0),
    };
    this.add(this.shaft);

    const matrix = new Matrix4();
    const transform = new Matrix4();

    const pivot = this.shaft.position.clone().add(this.shaft.hinge.pivotInB);
    transform.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    transform.premultiply(matrix.makeRotationX(pitch));
    transform.premultiply(
      matrix.makeTranslation(pivot.x, pivot.y, pivot.z)
    );
    this.shaft.applyMatrix4(transform);

    if (levers) {
      this.levers.forEach((lever, i) => {
        const pivot = lever.position.clone().add(lever.hinge.pivotInB);
        transform.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
        transform.premultiply(matrix.makeRotationX(Math.PI * -0.2 * (i === 0 ? offset : rate)));
        transform.premultiply(
          matrix.makeTranslation(pivot.x, pivot.y, pivot.z)
        );
        lever.applyMatrix4(transform);
      });
    }

    transform.makeTranslation(-this.base.position.x, -this.base.position.y, -this.base.position.z);
    transform.premultiply(matrix.makeRotationY(yaw));
    transform.premultiply(
      matrix.makeTranslation(this.base.position.x, this.base.position.y, this.base.position.z)
    );
    this.base.applyMatrix4(transform);
    if (levers) {
      this.levers.forEach((lever) => lever.applyMatrix4(transform));
    }
    this.shaft.applyMatrix4(transform);

    this.auxVector = new Vector3();

    this.shot = {
      launchPoint: new Vector3(0, 0, -1),
      direction: new Vector3(),
      origin: new Vector3(),
    };

    models.load('models/cannon.glb')
      .then((model) => {
        const [base, shaft, handle, lever] = model.children;
        base.position.set(-0.5, -0.5, -0.5);
        base.scale.setScalar(0.125);
        this.base.add(base);
        shaft.position.set(-0.2, -0.2, 0.875);
        shaft.rotation.x = Math.PI * -0.5;
        shaft.scale.set(0.1, 0.125, 0.1);
        this.shaft.add(shaft);
        handle.position.set(-0.1, 0.025, 0.7);
        handle.rotation.x = Math.PI * 0.5;
        handle.scale.setScalar(0.05);
        this.shaft.add(handle);
        lever.scale.setScalar(0.05);
        if (levers) {
          this.levers.forEach((mesh, i) => {
            const model = lever.clone();
            model.position.set(0.025 * (i === 0 ? 1 : -1), -0.3, 0.025 * (i === 0 ? 1 : -1));
            if (i === 0) {
              model.rotation.y = Math.PI;
            }
            mesh.add(model);
          });
        }
      });

    if (sfx) {
      sfx.load('sounds/shot.ogg')
        .then((sound) => {
          sound.filter = sound.context.createBiquadFilter();
          sound.setFilter(sound.filter);
          this.shaft.add(sound);
          this.sound = sound;
        });
    }
  }

  dispose() {
    const { base: { monitors } } = this;
    if (monitors) {
      monitors.forEach((monitor) => {
        monitor.dispose();
      });
    }
  }

  getShot() {
    const { shaft, shot } = this;
    shaft.localToWorld(shot.origin.copy(shot.launchPoint));
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

  updateLevers() {
    const { auxVector, base: { monitors }, levers } = this;
    const { offsets, rates, rateNames, worldUp } = Cannon;
    if (!levers) {
      return;
    }
    levers.forEach(({ matrixWorld }, i) => {
      auxVector.set(0, 1, 0).transformDirection(matrixWorld);
      const angle = Math.min(Math.max(auxVector.angleTo(worldUp) / (Math.PI * 0.2), 0), 1);
      const values = i === 0 ? offsets : rates;
      const value = values[Math.round(angle * (values.length - 1))];
      if (i === 0) {
        monitors[i].set(value > 0 ? `+${value}` : value);
        this.offset = value;
      } else {
        monitors[i].set(rateNames[value]);
        this.rate = value;
      }
    });
  }
}

Cannon.offsets = [0, 1, 2, 4];
Cannon.rates = [0, 8, 4, 2];
Cannon.rateNames = {
  0: 'OFF',
  8: 'x1',
  4: 'x2',
  2: 'x4',
};
Cannon.worldUp = new Vector3(0, 1, 0);

export default Cannon;
