import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Group,
  InstancedMesh,
  Matrix4,
  Vector3,
} from '../core/three.js';

class Escher extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 8, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/wind.ogg');
    scene.background = new Color(0x000D1A);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);

    this.world = new Group();
    this.world.scale.setScalar(0.5);
    this.add(this.world);

    Promise.all([
      models.load('models/escher.glb')
        .then((model) => {
          const matrix = new Matrix4();
          const size = 5;
          const instances = [];
          for (let z = -size; z <= size; z += 1) {
            for (let y = -size; y <= size; y += 1) {
              for (let x = -size; x <= size; x += 1) {
                if (Math.sqrt((x ** 2) + (y ** 2) + (z ** 2)) < size) {
                  instances.push([x * 32, y * 32, z * 32]);
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
        }),
      models.load('models/escherElevator.glb')
        .then((model) => {
          model.traverse((child) => {
            if (child.isMesh) {
              translocables.push(child);
            }
          });
          this.world.add(model);
        }),
      ])
      .then(() => {
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Escher', offset: this.elevator.getOffset(player) })
        );
      });
  }
}

Escher.display = 'Cubic Space Division';

export default Escher;
