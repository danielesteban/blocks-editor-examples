import Lightmap from '../core/lightmap.js';
import {
  Box3,
  FogExp2,
  Group,
  InstancedMesh,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Elevator from '../renderables/elevator.js';
import Train from '../renderables/train.js';
import * as worlds from '../worlds/index.js';

class Metro extends Group {
  constructor(scene, { destination, offset }) {
    super();

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/train.ogg');
    scene.fog = new FogExp2(0, 0.015);
    this.player = player;

    const track = new Group();
    track.position.set(0, -2.75, 0);
    track.scale.setScalar(0.25);

    const elevator = new Elevator({
      isOpen: !destination,
      models,
    });
    elevator.position.set(18, 9, 0);
    elevator.rotation.y = Math.PI * -0.5;
    translocables.push(elevator.translocables);
    track.add(elevator);
    this.elevator = elevator;

    const origin = new Vector3(-0.75, 0, 3.5);
    if (offset) {
      track.updateMatrixWorld();
      elevator.localToWorld(origin.copy(offset.position));
    }
    player.teleport(origin);
    if (offset) {
      player.rotate(elevator.rotation.y - offset.rotation);
    }

    const train = new Train({
      isOpen: !!destination,
      models,
    });
    train.scale.setScalar(0.25);
    train.position.set(0, -0.5, 4.625);
    translocables.push(train.translocables);
    this.add(train);
    this.train = train;

    if (!Metro.stations) {
      const stations = Object.keys(worlds)
        .filter((name) => name !== 'Metro');
      const values = window.crypto.getRandomValues(new Uint32Array(stations.length));
      for (let i = stations.length - 1; i >= 0; i -= 1) {
        const rand = values[i] % (i + 1);
        const temp = stations[i];
        stations[i] = stations[rand];
        stations[rand] = temp;
      }
      Metro.stations = stations;
    }
    const { stations } = Metro;

    const updateDisplay = () => {
      const { display } = worlds[stations[track.station]];
      train.setDisplay(`${track.isRunning ? 'Next station: ' : ''}${display}`);
    };

    Promise.all([
      models.load('models/tunnel.glb'),
      models.load('models/station.glb'),
    ])
      .then(([tunnel, station]) => {
        station.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });
        station.add(elevator);
        track.add(station);

        const count = 12;
        const chunks = [];
        const matrix = new Matrix4();
        tunnel.traverse((child) => {
          if (child.isMesh) {
            const chunk = new InstancedMesh(child.geometry, child.material, count * 2);
            chunk.position.copy(child.parent.position);
            chunks.push(chunk);
            track.add(chunk);
          }
        });

        let gap = destination ? (count - 1) : (count * 2 - 1);
        track.isRunning = true;
        track.position.z = 8;
        track.station = destination ? stations.findIndex((name) => name === destination) : 0;
        updateDisplay();
        track.animate = (delta) => {
          if (!track.isRunning) {
            return;
          }
          const speed = Math.min(Math.max(Math.abs(count - (gap + track.position.z / 8)), 0.1), 1) * 8;
          track.position.z = track.position.z + delta * speed;
          if (track.position.z >= 8) {
            gap = (gap + 1) % (count * 2 + 1);
            track.position.z %= 8;
            if (gap === count) {
              ambient.set('sounds/dark.ogg');
              track.isRunning = false;
              track.position.z = 0;
              train.isOpen = true;
              updateDisplay();
            }
            station.position.z = (gap - count) * 32;
            for (let i = 0; i < count * 2; i += 1) {
              let z = (i - count) * 32;
              if (i === gap) {
                z += 32;
              }
              matrix.setPosition(0, 0, z);
              chunks.forEach((chunk) => {
                chunk.setMatrixAt(i, matrix);
              });
            }
            chunks.forEach((chunk) => {
              chunk.instanceMatrix.needsUpdate = true;
            });
          }
          track.updateMatrixWorld();
        };
        track.run = () => {
          ambient.set('sounds/train.ogg');
          track.isRunning = true;
          train.isOpen = false;
          track.station = (track.station + 1) % stations.length;
          updateDisplay();
        };

        this.add(track);
        this.track = track;

        if (destination) {
          elevator.isOpen = true;
        }
        elevator.onClose = () => (
          scene.load(stations[track.station], { offset: elevator.getOffset(player) })
        );
      });
  }

  onAnimationTick({ delta }) {
    const {
      elevator,
      player,
      track,
      train,
    } = this;
    if (
      player.desktopControls.buttons.primaryDown
      || player.controllers.find(({ hand, buttons: { triggerDown } }) => (hand && triggerDown))
    ) {
      const isOnElevator = track && elevator.containsPoint(player.head.position);
      const isOnTrain = track && train.containsPoint(player.head.position);
      if (isOnElevator && elevator.isOpen) {
        elevator.isOpen = false;
      }
      if (isOnTrain && !track.isRunning) {
        track.run();
      }
    }
    elevator.animate(delta);
    train.animate(delta);
    if (track) {
      track.animate(delta);
      if (train.lightmap) {
        train.lightmap.materials.forEach(({ uniforms: { lightmapOrigin: { value: origin } } }) => {
          origin.copy(train.lightmap.origin).multiply(track.scale).add(track.position)
        });
      }
    }
  }
}

export default Metro;

