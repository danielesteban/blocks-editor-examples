import {
  Group,
  Matrix4,
  Quaternion,
  Vector3,
} from '../core/three.js';
import Box from './box.js';
import Monitor from './monitor.js';

class Cannon extends Group {
  constructor({ models, position, rotation = 0 }) {
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
    this.add(this.base);

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
      lever.physics.forEach(({ position, width, height, depth }) => {
        const box = new Box(width, height, depth);
        box.position.copy(position);
        lever.add(box);
      });
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

    this.shaft = new Group();
    this.shaft.position.copy(position).add(new Vector3(0, 0.425, 0));
    this.shaft.physics = {
      shape: 'box',
      width: 0.4,
      height: 0.4,
      depth: 1.5,
    };
    this.shaft.hinge = {
      type: 'hinge',
      friction: true,
      mesh: this.shaft,
      pivotInA: new Vector3(0, 0.425, 0.125),
      pivotInB: new Vector3(0, 0, 0.125),
      axisInA: new Vector3(1, 0, 0),
      axisInB: new Vector3(1, 0, 0),
    };
    // const box = new Box(0.4, 0.4, 1.5);
    // this.shaft.add(box);
    this.add(this.shaft);

    const matrix = new Matrix4();
    const transform = new Matrix4();
    transform.makeTranslation(-this.base.position.x, -this.base.position.y, -this.base.position.z);
    transform.premultiply(matrix.makeRotationY(rotation));
    transform.premultiply(
      matrix.makeTranslation(this.base.position.x, this.base.position.y, this.base.position.z)
    );
    this.base.applyMatrix4(transform);
    this.levers.forEach((lever) => lever.applyMatrix4(transform));
    this.shaft.applyMatrix4(transform);

    this.auxVector = new Vector3();

    this.shot = {
      launchPoint: new Vector3(0, 0, -1),
      direction: new Vector3(),
      origin: new Vector3(),
    };

    models.load('models/cannon.glb')
      .then((model) => {
        const [base, shaft] = model.children;
        base.position.set(-0.5, -0.5, -0.5);
        base.scale.setScalar(0.125);
        this.base.add(base);
        shaft.position.set(-0.2, -0.2, 0.875);
        shaft.rotation.x = Math.PI * -0.5;
        shaft.scale.set(0.1, 0.125, 0.1);
        this.shaft.add(shaft);
      });
  }

  dispose() {
    const { base: { monitors } } = this;
    monitors.forEach((monitor) => {
      monitor.dispose();
    });
  }

  getShot() {
    const { shaft, shot } = this;
    shaft.localToWorld(shot.origin.copy(shot.launchPoint));
    shaft.getWorldPosition(shot.direction);
    shot.direction.subVectors(shot.origin, shot.direction).normalize();
    return shot;
  }

  updateLevers() {
    const { auxVector, base: { monitors }, levers } = this;
    const { offsets, rates, rateNames, worldUp } = Cannon;
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
