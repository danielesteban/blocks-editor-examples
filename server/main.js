const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const Room = require('./room');

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false;
const allowedRooms = process.env.ALLOWED_ROOMS ? process.env.ALLOWED_ROOMS.split(',') : false;

const server = express();
server.use(helmet());
expressWS(server, null, { clientTracking: false });

const rooms = new Map();
server.ws('/:room', (client, req) => {
  if (allowedOrigins && allowedOrigins.indexOf(req.headers.origin) === -1) {
    client.send(JSON.stringify({
      type: 'ERROR',
      data: 'Origin not allowed.',
    }), () => {});
    client.terminate();
    return;
  }
  if (allowedRooms && allowedRooms.indexOf(req.params.room) === -1) {
    client.send(JSON.stringify({
      type: 'ERROR',
      data: 'Room not allowed.',
    }), () => {});
    client.terminate();
    return;
  }
  let room = rooms.get(req.params.room);
  if (!room) {
    room = new Room();
    rooms.set(req.params.room, room);
  }
  room.onClient(client, req);
});

server.use((req, res) => res.status(404).end());
server.listen(process.env.PORT || 3000);
