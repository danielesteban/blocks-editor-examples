import {
  Color,
  Euler,
  FogExp2,
  Group,
  InstancedMesh,
  Matrix4,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';

class Escher extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 16, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models } = scene;
    ambient.set('sounds/wind.ogg');
    scene.background = new Color(0x0D001A);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);
    scene.locomotion = scene.locomotions.fly;

    this.world = new Group();
    this.world.position.set(0, -0.5, 0);
    this.world.scale.setScalar(0.5);
    this.add(this.world);

    models.load('models/escher.glb')
      .then((model) => {
        const matrix = new Matrix4();
        const size = 3;
        const instances = [];
        for (let z = -size; z <= size; z += 1) {
          for (let y = -size; y <= size; y += 1) {
            for (let x = -size; x <= size; x += 1) {
              if (Math.sqrt((x ** 2) + (y ** 2) + (z ** 2)) < size) {
                instances.push([x * 64, y * 64, z * 64]);
              }
            }
          }
        }
        model.traverse((child) => {
          if (child.isMesh) {
            const chunk = new InstancedMesh(child.geometry, child.material, instances.length);
            const { position } = child.parent;
            for (let i = 0; i < chunk.count; i += 1) {
              matrix.setPosition(
                instances[i][0] + position.x,
                instances[i][1] + position.y,
                instances[i][2] + position.z
              );
              chunk.setMatrixAt(i, matrix);
            }
            this.world.add(chunk);
          }
        });

        this.elevator.isOpen = true;
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const { player: { position } } = this;
    if (position.x < -16) position.x += 32;
    if (position.x > 16) position.x -= 32;
    if (position.y < 0) position.y += 32;
    if (position.y > 32) position.y -= 32;
    if (position.z < -16) position.z += 32;
    if (position.z > 16) position.z -= 32;
  }
}

Escher.display = 'Cubic Space Division';

export default Escher;
