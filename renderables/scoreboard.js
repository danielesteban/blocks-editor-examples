import Monitor from './monitor.js';

class Scoreboard extends Monitor {
  constructor({ name }) {
    super({
      fonts: { title: 40, value: 80 },
      title: name,
      width: 256,
      height: 256,
      value: 0,
    });
  }

  inc(points) {
    this.value += points;
    this.update();
  }
}

export default Scoreboard;
