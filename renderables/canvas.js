import {
  Color,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  BoxBufferGeometry,
  RGBFormat,
} from '../core/three.js';

class Canvas extends Mesh {
  static setupGeometry() {
    Canvas.geometry = new BoxBufferGeometry(6, 4, 0.1);
  }

  static setupMaterial() {
    Canvas.renderer = document.createElement('canvas');
    Canvas.renderer.width = 510;
    Canvas.renderer.height = 340;
    const ctx = Canvas.renderer.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, Canvas.renderer.width, Canvas.renderer.height);
    ctx.globalAlpha = 0.25;
    const m = new MeshBasicMaterial({ color: 0xAAAAAA });
    const texture = new CanvasTexture(Canvas.renderer);
    texture.format = RGBFormat;
    Canvas.material = [
      m,
      m,
      m,
      m,
      new MeshBasicMaterial({
        map: texture,
      }),
      m,
    ];
  }

  constructor() {
    if (!Canvas.geometry) {
      Canvas.setupGeometry();
    }
    if (!Canvas.material) {
      Canvas.setupMaterial();
    }
    super(
      Canvas.geometry,
      Canvas.material
    );
  }

  static draw({ color, position, size }) {
    const { renderer, material } = Canvas;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      renderer.width * (position.x + 0.5),
      renderer.height * (1 - (position.y + 0.5)),
      size,
      0, 2 * Math.PI
    );
    ctx.fill();
    material[4].map.needsUpdate = true;
  }
}

export default Canvas;

