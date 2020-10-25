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

class Building extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 22.5, 2.25),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/wind.ogg');
    scene.background = new Color(0x110033);
    scene.fog = new FogExp2(scene.background.getHex(), 0.05);
   
    models.load('models/building.glb')
      .then((building) => {
        const buildings = new Group();
        const count = 12;
        const matrix = new Matrix4();
        const dummy = new Group();
        const offsets = [...Array(count)].map((v, i) => {
          const dist = Math.random() * 16 + 32;
          const y = Math.random() * 16 + 16;
          const angle = ((Math.PI * 2) / count) * (i + 1) + Math.PI * 0.5;
          dummy.position.set(
            Math.cos(angle) * dist,
            y,
            Math.sin(angle) * dist,
          );
          dummy.lookAt(0, y, 0);
          dummy.rotation.y += Math.PI;
          dummy.updateMatrix();
          return dummy.matrix.clone();
        });
        building.traverse((child) => {
          if (child.isMesh) {
            const chunk = new InstancedMesh(child.geometry, child.material, (count * 2) + 1);
            const { position } = child.parent;
            for (let i = 0; i < chunk.count; i += 1) {
              matrix.identity();
              matrix.setPosition(position.x, position.y + (i > count ? -47 : 0), position.z);
              if (i > 0) {
                matrix.premultiply(offsets[(i - 1) % count])
              }
              chunk.setMatrixAt(i, matrix);
            }
            buildings.add(chunk);
          }
        });
        buildings.scale.setScalar(0.5);
        this.add(buildings);

        building.scale.copy(buildings.scale);
        building.updateMatrixWorld();
        building.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });

        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Building', offset: this.elevator.getOffset(player) })
        );
      });
  }
}

Building.display = 'High Rises';

export default Building;
