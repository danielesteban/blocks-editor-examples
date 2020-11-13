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
    Map.stations = stations.map(({ id, isMultiplayer, name }, i) => {
      const angle = slice * i;
      return {
        id,
        isMultiplayer,
        name,
        index: i,
        x: Math.cos(angle) * dist + renderer.width * 0.5,
        y: Math.sin(angle) * dist + renderer.height * 0.5,
      };
    });
  }

  static update(current, progress, peers) {
    if (!Map.renderer || !Map.texture) {
      Map.setupTexture();
    }
    const { renderer, stations, texture } = Map;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#222';
    const b = 4;
    ctx.strokeRect(6, 6, renderer.width - 12, renderer.height - 12);
    
    const dist = renderer.width * 0.36;
    const slice = Math.PI * 2 / stations.length;

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#666';
    ctx.beginPath();
    ctx.arc(renderer.width * 0.5, renderer.height * 0.5 - 15, dist, 0, Math.PI * 2);
    ctx.stroke();
    
    if (progress !== null) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3a3';
      const angle = (current === 0 ? stations.length - 1 : current - 1) * slice;
      ctx.beginPath();
      ctx.arc(renderer.width * 0.5, renderer.height * 0.5 - 15, dist, angle, angle + slice);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(renderer.width * 0.5, renderer.height * 0.5 - 15, dist, angle + slice * progress - 0.02, angle + slice * (progress + 0.02));
      ctx.stroke();
    }

    stations.forEach(({ id, isMultiplayer, name, x, y }, i) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i === current ? '#393' : '#333';
      ctx.beginPath();
      ctx.arc(0, -15, 10, 0, Math.PI * 2);
      ctx.fill();
      if (isMultiplayer || peers[id]) {
        ctx.fillStyle = '#fff';
        ctx.fillText(peers[id] || 0, 0, -15);
      }
      ctx.fillStyle = i === current ? '#393' : 'rgba(51, 51, 51, 0.9)';
      ctx.beginPath();
      ctx.arc(-40, 9, 10, 0, Math.PI * 2);
      ctx.rect(-40, -1, 80, 20);
      ctx.arc(40, 9, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i === current ? '#fff' : '#666';
      ctx.fillText(name.substr(0, 10).trim().toUpperCase() + (name.length > 10 ? '…' : ''), 0, 10);
      ctx.restore();
    });
    texture.needsUpdate = true;
  }
}

export default Map;
