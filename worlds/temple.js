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
      position: new Vector3(),
      normal: new Vector3(),
      target: new Vector3(),
      impulse: new Vector3(),
    };

    models.load('models/temple.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
  
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Temple', offset: this.elevator.getOffset(player) })
        );
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

          this.sphere = 0;
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
    if (isOnElevator || !physics || !spheres) {
      return;
    }
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({ buttons, hand, isDesktop, raycaster }) => {
      const trigger = (hand && buttons.trigger) || (isDesktop && buttons.primary);
      const grip = (hand && buttons.grip) || (isDesktop && buttons.secondary);
      if (trigger || grip) {
        const { origin, direction } = raycaster.ray;
        const { position, normal, target, impulse } = aux;
        const resetMotion = (animation.time % 1) < 0.01;
        for (let i = 0; i < spheres.count; i += 1) {
          spheres.getPositionAt(i, position);
          normal.subVectors(position, origin).normalize();
          const d = position.distanceTo(origin);
          if (d < 32 && normal.dot(direction) > 0.98) {
            // This code is still WIP
            // I need to also integrate the velocity of the hand
            // (And prolly drop the phantom target idea)
            // I just want to commit the temple geometry already
            target.copy(origin).addScaledVector(direction, d);
            impulse
              .subVectors(target, position)
              .multiply(new Vector3(0.5, 1, 0.5))
              .normalize()
              .multiplyScalar(0.75);
            target.copy(normal);
            if (grip) {
              target.negate();
            }
            impulse.addScaledVector(target, (32 - d) / 32 * 0.25);
            impulse.multiplyScalar(0.5);
            physics.applyImpulse(spheres, impulse, i, resetMotion);
          }
        }
      }
    });
  }
}

Temple.display = 'Force Temple';

export default Temple;
