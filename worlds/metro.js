import {
  FogExp2,
  Group,
  InstancedMesh,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Elevator from '../renderables/elevator.js';
import Train from '../renderables/train.js';

class Metro extends Group {
  constructor(scene, { destination, offset }) {
    super();

    const { ambient, models, player, pointables, sfx, translocables } = scene;
    if (!destination) {
      ambient.set('sounds/train.ogg');
    }
    scene.fog = new FogExp2(0, 0.015);
    this.player = player;

    const stations = Object.keys(scene.worlds)
      .filter((id) => id !== 'Metro' && !scene.worlds[id].isWIP)
      .map((id) => ({
        id,
        isMultiplayer: scene.worlds[id].isMultiplayer,
        name: scene.worlds[id].display || scene.worlds[id].name,
      }));

    const track = new Group();
    track.position.set(0, -2.75, 0);
    track.scale.setScalar(0.25);
    track.isRunning = true;
    track.segments = 12;
    track.gap = destination ? (track.segments - 1) : (track.segments * 2 - 1);
    track.station = destination ? (
      stations.findIndex(({ id }) => id === destination)
    ) : (
      Math.floor(Math.random() * stations.length)
    );
    if (destination) {
      this.add(track);
    }

    const elevator = new Elevator({
      isOpen: !destination,
      models,
      sfx,
      onOpen: () => {
        elevator.onClose = () => (
          scene.load(stations[track.station].id, { offset: elevator.getOffset(player) })
        );
      },
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
      stations,
    });
    train.scale.setScalar(0.25);
    train.position.set(0, -0.25, 4.625);
    pointables.push(train.pointables);
    translocables.push(train.translocables);
    this.add(train);
    this.train = train;

    let peers = {};

    const updateMap = () => (
      train.setMap(track.station, track.isRunning ? track.progress : null, peers)
    );
    this.updateMap = updateMap;
    this.updateMapTimer = 0;

    const updateDisplay = () => {
      const { id, isMultiplayer, name } = stations[track.station];
      if (track.isRunning) {
        train.setDisplay(`Next station: ${name}`);
      } else {
        train.setDisplay(`${name}${(isMultiplayer || peers[id]) ? ` - ${peers[id] || 0} Players` : ''}`);
      }
    };

    const updatePeers = () => (
      fetch('https://train.gatunes.com/rooms/peers')
        .then((res) => res.json())
        .then((rooms) => {
          peers = rooms;
          if (!track.isRunning) {
            updateDisplay();
          }
          updateMap();
        })
    );

    this.updatePeersInterval = setInterval(updatePeers, 10000);
    updatePeers();
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
          track.position.z += delta * speed;
          if (track.position.z >= 8) {
            track.gap = (track.gap + 1) % (track.segments * 2 + 1);
            track.position.z %= 8;
            if (track.gap === track.segments) {
              ambient.set('sounds/dark.ogg');
              track.isRunning = false;
              track.position.z = 0;
              train.isOpen = true;
              updateDisplay();
              updateMap();
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
        } else {
          this.add(track);
        }
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
    ].forEach(({
      buttons,
      hand,
      isDesktop,
      pointer,
    }) => {
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
        train.lightmap.materials.forEach(({ uniforms: { lightmapOrigin: { value: origin } } }) => (
          origin.copy(train.lightmap.origin).multiply(track.scale).add(track.position)
        ));
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
