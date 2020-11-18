import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Monitor extends Mesh {
  static setupGeometry() {
    Monitor.geometry = new PlaneBufferGeometry(1, 1);
    Monitor.geometry.deleteAttribute('normal');
  }

  constructor({
    fonts = { title: 10, value: 20 },
    title,
    width = 64,
    height = 64,
    value = '',
  }) {
    if (!Monitor.geometry) {
      Monitor.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    renderer.width = width;
    renderer.height = height;
    super(
      Monitor.geometry,
      new MeshBasicMaterial({ map: new CanvasTexture(renderer) })
    );
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = '#222';
    const b = width / 64;
    ctx.fillRect(b, b, renderer.width - (b * 2), renderer.height - (b * 2));
    ctx.fillStyle = '#eee';
    ctx.fillRect(b * 2, b * 2, renderer.width - (b * 4), renderer.height - (b * 4));
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fonts.title}px monospace`;
    ctx.fillText(title, renderer.width * 0.5, renderer.height * 0.3);
    ctx.font = `${fonts.value}px monospace`;
    this.renderer = renderer;
    this.value = value;
    this.update();
  }

  dispose() {
    const { material } = this;
    material.map.dispose();
    material.dispose();
  }

  set(value) {
    if (this.value === value) {
      return;
    }
    this.value = value;
    this.update();
  }

  update() {
    const { material, renderer, value } = this;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(10, renderer.height * 0.5, renderer.width - 20, renderer.height * 0.5 - 10);
    ctx.fillStyle = '#000';
    ctx.fillText(value, renderer.width * 0.5, renderer.height * 0.65);
    material.map.needsUpdate = true;
  }
}

export default Monitor;
