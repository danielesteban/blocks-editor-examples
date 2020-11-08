const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const Room = require('./room');

const rooms = [
  'Climb',
  'Island',
  'Museum',
].map((id) => new Room(id));

const server = express();
server.use(helmet());
expressWS(server, null, { clientTracking: false });
rooms.forEach((room) => {
  server.ws(`/:${room.id}`, room.onClient.bind(room));
});
server.use((req, res) => res.status(404).end());
server.listen(process.env.PORT || 3000);
