import Ambient from './ambient.js';
import { AmmoPhysics } from './ammo.js';
import CurveCast from './curvecast.js';
import Models from './models.js';
import Player from './player.js';
import { Scene as ThreeScene } from './three.js';

// A VR scene base class

class Scene extends ThreeScene {
  constructor({ renderer: { camera, dom, renderer }, worlds }) {
    super();

    this.locomotion = Scene.locomotions.teleport;
  
    this.models = new Models();

    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.ambient = new Ambient(this.player.head.context.state === 'running');

    this.translocables = [];

    this.worlds = worlds;

    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      const { context } = this.player.head;
      if (context.state === 'suspended') {
        context.resume();
        this.ambient.resume();
        if (this.world && this.world.onAudioContext) {
          this.world.onAudioContext();
        }
      }
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
      player: { head: { context } },
      translocables,
      worlds,
    } = this;
    this.background = null;
    this.fog = null;
    ambient.set(null);
    if (physics) {
      physics.reset();
    }
    translocables.length = 0;
    if (this.world) {
      if (this.world.onUnload) {
        this.world.onUnload();
      }
      this.remove(this.world);
    }
    this.world = new worlds[world](this, options);
    if (this.world.onAudioContext && context.state === 'running') {
      this.world.onAudioContext();
    }
    this.add(this.world);
  }

  onBeforeRender({ animation, xr }, scene, camera) {
    const { locomotions } = Scene;
    const {
      ambient,
      locomotion,
      player,
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
      if (secondaryDown) {
        xr.getSession().end();
      }
    });
    if (world && world.onAnimationTick) {
      world.onAnimationTick(animation);
    }
  }

  onEnterVR() {
    const { world } = this;
    if (world && world.onEnterVR) {
      world.onEnterVR();
    }
  }

  onExitVR() {
    const { world } = this;
    if (world && world.onExitVR) {
      world.onExitVR();
    }
  }
}

Scene.locomotions = {
  fly: 0,
  teleport: 1,
};

export default Scene;
