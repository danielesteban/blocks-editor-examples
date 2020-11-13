import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  Vector3,
} from '../core/three.js';

class Map extends Mesh {
  static setupGeometry() {
    Map.geometry = new PlaneBufferGeometry(6, 6);
    Map.geometry.deleteAttribute('normal');
  }

  static setupTexture() {
    Map.renderer = document.createElement('canvas');
    Map.renderer.width = 512;
    Map.renderer.height = 512;
    const ctx = Map.renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px monospace';
    Map.texture = new CanvasTexture(Map.renderer);
  }

  constructor({
    material,
    materials,
  }) {
    if (!Map.geometry) {
      Map.setupGeometry();
    }
    if (!Map.renderer || !Map.texture) {
      Map.setupTexture();
    }
    material.transparent = true;
    material.uniforms.opacity.value = 0.8;
    material.uniforms.map.value = Map.texture;
    material.map = Map.texture;
    materials.push(material);
    super(
      Map.geometry,
      material
    );
    this.aux = new Vector3();
    this.isMap = true;
  }

  getStationAtPoint(target, radius = 0.1) {
    const { aux } = this;
    const { renderer, stations } = Map;
    this.worldToLocal(target).divideScalar(6).add(aux.set(0.5, 0.5, 0));
    return stations.find(({ x, y }) => aux.set(x / renderer.width, 1 - (y / renderer.height), 0).distanceTo(target) < radius);
  }

  static setStations(stations) {
    if (!Map.renderer) {
      Map.setupTexture();
    }
    const { renderer } = Map;
    const dist = renderer.width * 0.36;
    const slice = Math.PI * 2 / stations.length;
    Map.stations = stations.map((name, i) => {
      const angle = slice * i;
      return {
        name,
        index: i,
        x: Math.cos(angle) * dist + renderer.width * 0.5,
        y: Math.sin(angle) * dist + renderer.height * 0.5,
      };
    });
  }

  static update(current) {
    if (!Map.renderer || !Map.texture) {
      Map.setupTexture();
    }
    const { renderer, stations, texture } = Map;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = '#222';
    const b = 4;
    ctx.fillRect(b, b, renderer.width - (b * 2), renderer.height - (b * 2));
    ctx.fillStyle = '#eee';
    ctx.fillRect(b * 2, b * 2, renderer.width - (b * 4), renderer.height - (b * 4));
    ctx.fillStyle = '#000';
    
    const dist = renderer.width * 0.36;

    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(renderer.width * 0.5, renderer.height * 0.5 - 15, dist + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eee';
    ctx.beginPath();
    ctx.arc(renderer.width * 0.5, renderer.height * 0.5 - 15, dist - 5, 0, Math.PI * 2);
    ctx.fill();

    stations.forEach(({ name, x, y }, i) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i === current ? '#393' : '#333';
      ctx.fillRect(-50, 0, 100, 20);
      ctx.beginPath();
      ctx.arc(0, -15, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i === current ? '#fff' : '#666';
      ctx.fillText(name.substr(0, 10).trim().toUpperCase() + (name.length > 10 ? '…' : ''), 0, 10);
      ctx.restore();
    });
    texture.needsUpdate = true;
  }
}

export default Map;