import ElevatorWorld from '../core/elevatorWorld.js';
import Lightmap from '../core/lightmap.js';
import {
  Color,
  Euler,
  FogExp2,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Spheres from '../renderables/spheres.js';

class Temple extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 4.5, 11.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/museum.ogg');
    scene.background = new Color(0x224466);
  
    this.aux = {
      impulse: new Vector3(),
      position: new Vector3(),
      velocity: new Vector3(),
    };

    models.load('models/temple.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
  
        this.elevator.isOpen = true;
      });

    Promise.all([
      models.lightmap('models/templeLightmap.json'),
      Promise.all([
        scene.getPhysics(),
        models.physics('models/templePhysics.json', 0.5),
      ])
        .then(([physics, boxes]) => {
          this.physics = physics;
          boxes.forEach((box) => {
            translocables.push(box);
            this.physics.addMesh(box);
            this.add(box);
          });
          player.controllers.forEach(({ physics }) => {
            this.physics.addMesh(physics, 0, { isKinematic: true });
          });
        }),
      ])
        .then(([lightmap]) => {
          lightmap.material.uniforms.lightmapSize.value.copy(lightmap.size).multiplyScalar(0.5);
          lightmap.material.uniforms.lightmapOrigin.value.copy(lightmap.origin).multiplyScalar(0.5);
          lightmap.material.vertexColors = true;

          this.spheres = new Spheres({ count: 100, material: lightmap.material });
          const matrix = new Matrix4();
          for (let i = 0; i < this.spheres.count; i += 1) {
            matrix.setPosition((Math.random() - 0.5) * 4, 1 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
            this.spheres.setMatrixAt(i, matrix);
          }
          this.physics.addMesh(this.spheres, 1);
          this.add(this.spheres);
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      aux,
      isOnElevator,
      physics,
      player,
      spheres,
    } = this;
    if (isOnElevator || !physics || !spheres || player.destination) {
      return;
    }
    player.controllers.forEach(({ buttons, hand, worldspace }) => {
      if (!hand || !buttons.trigger) {
        return;
      }
      const { impulse, position, velocity } = aux;
      velocity
        .copy(worldspace.movement)
        .divideScalar(animation.delta)
        .multiplyScalar(0.5);
      for (let i = 0; i < spheres.count; i += 1) {
        spheres.getPositionAt(i, position);
        if (worldspace.position.distanceTo(position) < 32) {
          impulse.copy(velocity);
          impulse.x *= Math.min(Math.random(), 0.5);
          impulse.y *= Math.min(Math.random(), 0.5);
          impulse.z *= Math.min(Math.random(), 0.5);
          physics.applyImpulse(spheres, impulse, i);
        }
      }
    });
  }
}

Temple.display = 'Force Temple';

export default Temple;
