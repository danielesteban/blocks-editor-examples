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
import Canvas from '../renderables/canvas.js';
import Spheres from '../renderables/spheres.js';

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
   
    this.world = new Group();
    this.world.scale.setScalar(0.5);
    this.add(this.world);

    models.load('models/building.glb')
      .then((building) => {
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
            this.world.add(chunk);
          }
        });

        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Building', offset: this.elevator.getOffset(player) })
        );
      });
    
    const canvas = new Canvas();
    const color = new Color();
    const position = new Vector3();
    const size = new Vector3(
      canvas.geometry.parameters.width,
      canvas.geometry.parameters.height,
      canvas.geometry.parameters.length
    );
    canvas.onContact = ({ mesh, index, point }) => {
      if (mesh === this.spheres) {
        color.fromBufferAttribute(this.spheres.instanceColor, index);
        this.world.localToWorld(position.copy(point));
        canvas.worldToLocal(position).divide(size);
        Canvas.draw({ color: `#${color.getHexString()}`, position, size: 20 });
      }
    };
    canvas.position.set(0, 48.5, -7);
    canvas.rotation.set(Math.PI * -0.2, 0, 0);
    this.world.add(canvas);

    Promise.all([
      scene.getPhysics(),
      models.physics('models/buildingPhysics.json'),
    ])
      .then(([physics, boxes]) => {
        this.physics = physics;
        this.physics.addTrigger(canvas, true);

        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.world.add(box);
        });

        this.sphere = 0;
        this.spheres = new Spheres({ count: 50 });
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition((Math.random() - 0.5) * 8, 64 + Math.random() * 16, Math.random() * 8);
          this.spheres.setMatrixAt(i, matrix);
        }
        this.physics.addMesh(this.spheres, 1);
        this.spheres.geometry = Spheres.geometries.model;
        this.world.add(this.spheres);
    });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      isOnElevator,
      physics,
      player,
      spheres,
    } = this;
    if (isOnElevator || !physics || !spheres) {
      return;
    }
    const controller = (
      player.desktopControls.buttons.primaryDown ? (
        player.desktopControls
      ) : (
        player.controllers.find(({ hand, buttons: { triggerDown } }) => (hand && triggerDown))
      )
    );
    if (controller) {
      const { sphere, world } = this;
      const { origin, direction } = controller.raycaster.ray;
      this.sphere = (this.sphere + 1) % spheres.count;
      physics.setMeshPosition(
        spheres,
        world.worldToLocal(
          origin
            .clone()
            .addScaledVector(direction, 0.5)
        ),
        sphere
      );
      physics.applyImpulse(spheres, direction.clone().multiplyScalar(20), sphere);
    }
  }
}

Building.display = 'High Altitude Art';

export default Building;
