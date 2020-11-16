import { Group, Quaternion, Vector3 } from '../core/three.js';
// import Box from './box.js';

class Cannon extends Group {
  constructor({ models, position }) {
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
    this.base.hinge = {
      type: 'hinge',
      friction: true,
      position: new Vector3(0, -0.5, 0),
      rotation: (new Quaternion()).setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * -0.5),
    };
    // this.base.physics.forEach(({ position, width, height, depth }) => {
    //   const box = new Box(width, height, depth);
    //   box.position.copy(position);
    //   this.base.add(box);
    // });
    this.add(this.base);

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
      pivotInA: new Vector3(0, 0.425, -0.125),
      pivotInB: new Vector3(0, 0, -0.125),
      axisInA: new Vector3(1, 0, 0),
      axisInB: new Vector3(1, 0, 0),
    };
    // const box = new Box(0.4, 0.4, 1.5);
    // this.shaft.add(box);
    this.add(this.shaft);

    this.shot = {
      launchPoint: new Vector3(0, 0, 1),
      direction: new Vector3(),
      origin: new Vector3(),
    };

    models.load('models/cannon.glb')
      .then((model) => {
        const [base, shaft] = model.children;
        base.position.set(-0.5, -0.5, -0.5);
        base.scale.setScalar(0.125);
        this.base.add(base);
        shaft.position.set(-0.2, 0.2, -0.875);
        shaft.rotation.x = Math.PI * 0.5;
        shaft.scale.set(0.1, 0.125, 0.1);
        this.shaft.add(shaft);
      });
  }

  getShot() {
    const { shaft, shot } = this;
    shaft.localToWorld(shot.origin.copy(shot.launchPoint));
    shaft.getWorldPosition(shot.direction);
    shot.direction.subVectors(shot.origin, shot.direction).normalize();
    return shot;
  }
}

export default Cannon;
