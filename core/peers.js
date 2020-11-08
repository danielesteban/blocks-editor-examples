import SimplePeer from './simplepeer.js';
import { Group } from './three.js';
import Peer from '../renderables/peer.js';

// P2P multiplayer client

class Peers extends Group {
  constructor({
    onState,
    player,
    room,
  }) {
    super();
    this.onState = onState;
    this.peers = [];
    this.player = player;
    this.room = room;
    this.connectToServer();
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(this.onUserMedia.bind(this))
        .catch(() => {});
    }
  }

  animate({ delta }) {
    const { peers, player } = this;
    
    const hands = player.controllers
      .filter(({ hand }) => (!!hand))
      .sort(({ hand: { handedness: a } }, { hand: { handedness: b } }) => b.localeCompare(a));

    const update = new Float32Array([
      ...player.head.position.toArray(),
      ...player.head.quaternion.toArray(),
      ...(hands.length === 2 ? (
        hands.reduce((hands, { hand: { state }, worldspace: { position, quaternion } }) => {
          hands.push(
            ...position.toArray(),
            ...quaternion.toArray(),
            state
          );
          return hands;
        }, [])
      ) : []),
    ]);
    const payload = new Uint8Array(1 + update.byteLength);
    payload[0] = 0x01;
    payload.set(new Uint8Array(update.buffer), 1);

    peers.forEach(({ connection, controllers }) => {
      if (
        connection
        && connection._channel
        && connection._channel.readyState === 'open'
      ) {
        try {
          connection.send(payload);
        } catch (e) {
          return;
        }
        if (!connection.hasSentSkin) {
          connection.hasSentSkin = true;
          const encoded = (new TextEncoder()).encode(player.skin);
          const payload = new Uint8Array(1 + encoded.length);
          payload.set(encoded, 1);
          try {
            connection.send(payload);
          } catch (e) {
            // console.log(e);
          }
        }
      }
      controllers.forEach((controller) => {
        if (controller.visible) {
          controller.hand.animate({ delta });
        }
      });
    });
  }

  connectToPeer({ id, initiator = false }) {
    const {
      player,
      server,
      userMedia,
    } = this;
    const connection = new SimplePeer({
      initiator,
      stream: userMedia,
    });
    const peer = new Peer({ peer: id, connection, listener: player.head });
    connection.on('error', () => {});
    connection.on('data', peer.onData.bind(peer));
    connection.on('signal', (signal) => (
      server.send(JSON.stringify({
        type: 'SIGNAL',
        data: {
          peer: id,
          signal: JSON.stringify(signal),
        },
      }))
    ));
    connection.on('track', peer.onTrack.bind(peer));
    this.add(peer);
    return peer;
  }

  connectToServer() {
    const { peers, room } = this;
    if (this.server) {
      this.disconnect();
    }
    const server = new WebSocket(room);
    server.onerror = () => {};
    server.onclose = () => {
      this.reset();
      if (server.error) {
        // const dialog = document.createElement('div');
        // dialog.id = 'error';
        // dialog.innerText = server.error;
        // document.body.appendChild(dialog);
        return;
      }
      this.reconnectTimer = setTimeout(this.connectToServer.bind(this), 1000);
    };
    server.onmessage = this.onMessage.bind(this);
    this.server = server;
  }

  disconnect() {
    const { server } = this;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (!server) {
      return;
    }
    server.onclose = null;
    server.onmessage = null;
    server.close();
    this.reset();
  }

  onMessage({ data: json }) {
    const { peers, server } = this;
    let event;
    try {
      event = JSON.parse(json);
    } catch (e) {
      return;
    }
    const { type, data } = event;
    switch (type) {
      case 'ERROR':
        server.error = data;
        break;
      case 'INIT':
        this.peers = data.peers.map((id) => this.connectToPeer({ id, initiator: true }));
        if (this.onState) {
          this.onState(data.state);
        }
        break;
      case 'JOIN':
        peers.push(this.connectToPeer({ id: data }));
        break;
      case 'LEAVE': {
        const index = peers.findIndex(({ peer: id }) => (id === data));
        if (~index) {
          const [peer] = peers.splice(index, 1);
          this.remove(peer);
          peer.dispose();
        }
        break;
      }
      case 'SIGNAL': {
        const { connection } = peers[
          peers.findIndex(({ peer: id }) => (id === data.peer))
        ] || {};
        if (connection && !connection.destroyed) {
          let signal;
          try {
            signal = JSON.parse(data.signal);
          } catch (e) {
            return;
          }
          connection.signal(signal);
        }
        break;
      }
      case 'STATE':
        if (this.onState) {
          this.onState(data);
        }
        break;
      default:
        break;
    }
  }

  onUserMedia(stream) {
    const { peers } = this;
    this.userMedia = stream;
    peers.forEach(({ connection }) => {
      if (!connection.destroyed) {
        connection.addStream(stream);
      }
    });
  }

  reset() {
    const { peers } = this;
    peers.forEach((peer) => {
      this.remove(peer);
      peer.dispose();
    });
    peers.length = 0;
  }

  updateState() {
    const { server } = this;
    if (server) {
      server.send(JSON.stringify({
        type: 'STATE',
      }));
    }
  }
}

export default Peers;