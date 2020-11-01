import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from '../core/three.js';

class Cannon extends Mesh {
  static setupGeometries() {
    Cannon.geometries = [
      [1, 1, 1],
      [0.5, 0.5, 2]
    ].map(([w, h, d], isShaft) => {
      const box = new BoxGeometry(w, h, d, w * 4, h * 4, d * 4);
      box.faces.forEach((face, i) => {
        if (i % 2 === 0) {
          const l = isShaft && i > 127 ? 0.1 : 0.3;
          face.color.setHSL(Math.random(), 0.6 + Math.random() * 0.2, l * 0.5 + Math.random() * l);
        } else {
          face.color.copy(box.faces[i - 1].color);
        }
      });
      const geometry = (new BufferGeometry()).fromGeometry(box);
      if (isShaft) {
        geometry.translate(0, 0, d * 0.5);
      } else {
        geometry.translate(0, h * 0.5, 0);
      }
      delete geometry.attributes.normal;
      delete geometry.attributes.uv;
      return geometry;
    });
  }

  static setupMaterial() {
    Cannon.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor() {
    if (!Cannon.geometries) {
      Cannon.setupGeometries();
    }
    if (!Cannon.material) {
      Cannon.setupMaterial();
    }
    super(
      Cannon.geometries[0],
      Cannon.material
    );
    this.shaft = new Mesh(
      Cannon.geometries[1],
      Cannon.material
    );
    this.shaft.position.set(0, 0.75, 0);
    this.shaft.launchPoint = new Vector3(0, 0, 2.25);
    this.add(this.shaft);
    this.shot = {
      origin: new Vector3(),
      direction: new Vector3(),
    };
  }

  animate({ time }) {
    const { rotation, shaft } = this;
    rotation.y = Math.sin(time) * 0.1;
    shaft.rotation.x = Math.PI * -0.125 + Math.sin(time * 1.5) * 0.1;
  }

  getShot() {
    const { shaft, shot } = this;
    shaft.localToWorld(shot.origin.copy(shaft.launchPoint));
    shaft.getWorldPosition(shot.direction);
    shot.direction.subVectors(shot.origin, shot.direction).normalize();
    return shot;
  }
}

export default Cannon;
