import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Scoreboard extends Mesh {
  static setupGeometry() {
    Scoreboard.geometry = new PlaneBufferGeometry(1, 1);
    Scoreboard.geometry.deleteAttribute('normal');
  }

  constructor({ name }) {
    if (!Scoreboard.geometry) {
      Scoreboard.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    renderer.width = 256;
    renderer.height = 256;
    super(
      Scoreboard.geometry,
      new MeshBasicMaterial({ map: new CanvasTexture(renderer) }),
    );
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '40px monospace';
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = '#222';
    const b = 4;
    ctx.fillRect(b, b, renderer.width - (b * 2), renderer.height - (b * 2));
    ctx.fillStyle = '#eee';
    ctx.fillRect(b * 2, b * 2, renderer.width - (b * 4), renderer.height - (b * 4));
    ctx.fillStyle = '#000';
    ctx.fillText(name, renderer.width * 0.5, renderer.height * 0.25);
    ctx.font = '80px monospace';
    this.renderer = renderer;
    this.score = 0;
    this.update();
  }

  dispose() {
    const { material } = this;
    material.map.dispose();
    material.dispose();
  }

  inc(points) {
    this.score += points;
    this.update();
  }

  update() {
    const { material, renderer, score } = this;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(10, renderer.height * 0.5, renderer.width - 20, renderer.height * 0.5 - 10);
    ctx.fillStyle = '#000';
    ctx.fillText(score, renderer.width * 0.5, renderer.height * 0.65);
    material.map.needsUpdate = true;
  }
}

export default Scoreboard;
