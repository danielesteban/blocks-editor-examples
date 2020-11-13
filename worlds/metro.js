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

    const { ambient, models, player, pointables, translocables } = scene;
    if (!destination) {
      ambient.set('sounds/train.ogg');
    }
    scene.fog = new FogExp2(0, 0.015);
    this.player = player;

    const track = new Group();
    track.position.set(0, -2.75, 0);
    track.scale.setScalar(0.25);
    track.isRunning = true;
    track.segments = 12;
    track.gap = destination ? (track.segments - 1) : (track.segments * 2 - 1);
    track.progress = 0;
    track.station = destination ? stations.findIndex((name) => name === destination) : 0;
    this.add(track);

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
      player.teleport(origin);
      player.rotate(elevator.rotation.y - offset.rotation);
    } else {
      player.rotation.y = 0;
      player.teleport(origin);
    }

    const train = new Train({
      isOpen: !!destination,
      models,
    });
    train.scale.setScalar(0.25);
    train.position.set(0, -0.25, 4.625);
    pointables.push(train.pointables);
    translocables.push(train.translocables);
    this.add(train);
    this.train = train;

    const updateMap = () => (
      train.setMap(track.station, track.isRunning ? track.progress : 1, peers)
    );
    this.updateMap = updateMap;
    this.updateMapTimer = 0;

    let peers = {};
    const updatePeers = () => (
      fetch('https://train.gatunes.com/rooms/peers')
        .then((res) => res.json())
        .then((rooms) => {
          peers = rooms;
          updateMap();
        })
    );

    this.updatePeersInterval = setInterval(updatePeers, 10000);
    updatePeers();

    const updateDisplay = () => {
      const { display, name } = worlds[stations[track.station]];
      train.setDisplay(`${track.isRunning ? 'Next station: ' : ''}${display || name}`);
    };

    train.setMapStations(stations.map((id) => ({ id, name: worlds[id].display || worlds[id].name })));
    if (!destination) {
      updateDisplay();
      updateMap();
    }

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

        const chunks = [];
        const matrix = new Matrix4();
        tunnel.traverse((child) => {
          if (child.isMesh) {
            const chunk = new InstancedMesh(child.geometry, child.material, track.segments * 2);
            chunk.position.copy(child.parent.position);
            chunks.push(chunk);
            track.add(chunk);
          }
        });

        track.position.z = 8;
        track.animate = (delta) => {
          if (!track.isRunning) {
            return;
          }
          const speed = Math.min(Math.max(Math.abs(track.segments - (track.gap + track.position.z / 8)), 0.1), 1) * 8;
          track.position.z = track.position.z + delta * speed;
          if (track.position.z >= 8) {
            track.gap = (track.gap + 1) % (track.segments * 2 + 1);
            track.position.z %= 8;
            if (track.gap === track.segments) {
              ambient.set('sounds/dark.ogg');
              track.isRunning = false;
              track.position.z = 0;
              train.isOpen = true;
              updateDisplay();
            }
            station.position.z = (track.gap - track.segments) * 32;
            for (let i = 0; i < track.segments * 2; i += 1) {
              let z = (i - track.segments) * 32;
              if (i === track.gap) {
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
          track.progress = Math.min(Math.max((track.gap + track.position.z / 8) / (track.segments * 2), 0), 1);
          track.progress += track.progress < 0.5 ? 0.5 : -0.5;
          track.updateMatrixWorld();
        };
        track.goTo = (station) => {
          if (!track.isRunning) {
            ambient.set('sounds/train.ogg');
            track.isRunning = true;
            train.isOpen = false;
          }
          track.station = station % stations.length;
          updateDisplay();
          updateMap();
        };
        this.track = track;

        if (destination) {
          elevator.isOpen = true;
        }
        elevator.onClose = () => (
          scene.load(stations[track.station], { offset: elevator.getOffset(player) })
        );
      });
  }

  onAnimationTick({ delta, time }) {
    const {
      elevator,
      player,
      track,
      train,
      updateMapTimer,
    } = this;
    const isOnElevator = track && elevator.containsPoint(player.head.position);
    const isOnTrain = track && train.containsPoint(player.head.position);
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({ buttons, hand, isDesktop, pointer }) => {
      if ((hand && buttons.triggerDown) || (isDesktop && buttons.primaryDown)) {
        if (pointer && pointer.visible && pointer.target.object.isMap) {
          const station = pointer.target.object.getStationAtPoint(pointer.target.point);
          if (station) {
            track.goTo(station.index);
          }
          return; 
        }

        if (isOnElevator && elevator.isOpen) {
          elevator.isOpen = false;
        }
        if (isOnTrain && !track.isRunning) {
          track.goTo(track.station + 1);
        }
      }
    });
    elevator.animate(delta);
    train.animate(delta);
    if (track) {
      track.animate(delta);
      if (train.lightmap) {
        train.lightmap.materials.forEach(({ uniforms: { lightmapOrigin: { value: origin } } }) => {
          origin.copy(train.lightmap.origin).multiply(track.scale).add(track.position)
        });
      }
      if (track.isRunning && time >= updateMapTimer + 1) {
        this.updateMapTimer = time;
        this.updateMap();
      }
    }
  }

  onUnload() {
    const { updatePeersInterval } = this;
    clearInterval(updatePeersInterval);
  }
}

export default Metro;

