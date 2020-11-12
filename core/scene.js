import Ambient from './ambient.js';
import { AmmoPhysics } from './ammo.js';
import CurveCast from './curvecast.js';
import Models from './models.js';
import Player from './player.js';
import SFX from './sfx.js';
import { Scene as ThreeScene } from './three.js';

// A VR scene base class

class Scene extends ThreeScene {
  constructor({ renderer: { camera, dom, renderer }, worlds }) {
    super();

    this.locomotion = Scene.locomotions.teleport;
    this.locomotions = Scene.locomotions;
  
    this.models = new Models();

    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.ambient = new Ambient(this.player.head.context.state === 'running');
    this.sfx = new SFX({ listener: this.player.head });

    this.pointables = [];
    this.translocables = [];

    this.worlds = worlds;

    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      this.resumeAudio();
    };
    document.addEventListener('mousedown', onFirstInteraction);
  }

  getPhysics() {
    if (this.physics) {
      return Promise.resolve(this.physics);
    }
    return AmmoPhysics()
      .then((physics) => {
        this.physics = physics;
        return physics;
      });
  }

  load(world, options = {}) {
    const {
      ambient,
      physics,
      player,
      pointables,
      translocables,
      worlds,
    } = this;
    this.background = null;
    this.fog = null;
    this.locomotion = Scene.locomotions.teleport;
    ambient.set(null);
    player.detachAll();
    if (physics) {
      physics.reset();
    }
    pointables.length = 0;
    translocables.length = 0;
    if (this.world) {
      if (this.world.onUnload) {
        this.world.onUnload();
      }
      this.remove(this.world);
    }
    this.world = new worlds[world](this, options);
    if (this.world.resumeAudio && player.head.context.state === 'running') {
      this.world.resumeAudio();
    }
    this.add(this.world);
    const path = `#/${world}`;
    if (document.location.hash !== path) {
      window.history.pushState({}, '', path);
    }
  }

  onBeforeRender({ animation, xr }, scene, camera) {
    const { locomotions } = Scene;
    const {
      ambient,
      locomotion,
      player,
      pointables,
      translocables,
      world,
    } = this;
    ambient.onAnimationTick(animation)
    player.onAnimationTick({ animation, camera });
    player.controllers.forEach((controller) => {
      const {
        buttons: {
          backwards,
          forwards,
          forwardsUp,
          leftwards,
          leftwardsDown,
          rightwards,
          rightwardsDown,
          secondaryDown,
        },
        hand,
        marker,
        pointer,
        raycaster,
        worldspace,
      } = controller;
      if (!hand) {
        return;
      }
      if (
        !player.destination
        && hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        player.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        locomotion === locomotions.teleport
        && !player.destination
        && hand.handedness === 'right'
        && (forwards || forwardsUp)
      ) {
        const { hit, points } = CurveCast({
          intersects: translocables.flat(),
          raycaster,
        });
        if (hit) {
          if (forwardsUp) {
            player.translocate(hit.point);
          } else {
            marker.update({ animation, hit, points });
          }
        }
      }
      if (
        locomotion === locomotions.fly
        && hand.handedness === 'right'
        && (backwards || forwards || leftwards || rightwards)
      ) {
        const movement = { x: 0, y: 0, z: 0 };
        if (backwards) {
          movement.z = 1;
        }
        if (forwards) {
          movement.z = -1;
        }
        if (leftwards) {
          movement.x = -1;
        }
        if (rightwards) {
          movement.x = 1;
        }
        player.fly({
          animation,
          direction: worldspace.quaternion,
          movement,
        });
      }
      if (pointables.length) {
        const hit = raycaster.intersectObjects(pointables.flat())[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
            target: hit,
          });
        }
      }
      if (secondaryDown) {
        xr.getSession().end();
      }
    });
    if (world && world.onAnimationTick) {
      world.onAnimationTick(animation);
    }
  }

  resumeAudio() {
    const { ambient, player: { head: { context } }, world } = this;
    if (context.state === 'suspended') {
      context.resume();
    }
    ambient.resume();
    if (world && world.resumeAudio) {
      world.resumeAudio();
    }
  }
}

Scene.locomotions = {
  fly: 0,
  teleport: 1,
};

export default Scene;
