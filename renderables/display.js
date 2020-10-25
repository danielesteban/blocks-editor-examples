import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Display extends Mesh {
  static setupGeometry() {
    Display.geometry = new PlaneBufferGeometry(7, 1);
  }

  static setupTexture() {
    Display.renderer = document.createElement('canvas');
    Display.renderer.width = 511;
    Display.renderer.height = 73;
    const ctx = Display.renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '24px monospace';
    Display.texture = new CanvasTexture(Display.renderer);
  }

  constructor({
    lightmap,
    material,
    materials,
    models,
    swapMaterials,
  }) {
    if (!Display.geometry) {
      Display.setupGeometry();
    }
    if (!Display.renderer || !Display.texture) {
      Display.setupTexture();
    }
    material.uniforms.map.value = Display.texture;
    material.map = Display.texture;
    materials.push(material);
    super(
      Display.geometry,
      material
    );
    models.load('models/display.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.position.set(-4, -1, -0.85);
        const modelMaterials = {};
        model.traverse((child) => {
          if (child.isMesh) {
            swapMaterials(child, modelMaterials);
          }
        });
        materials.push(modelMaterials.opaque);
        this.add(model);
      });
  }

  static update(text) {
    if (!Display.renderer || !Display.texture) {
      Display.setupTexture();
    }
    const { renderer, texture } = Display;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = '#222';
    const b = 4;
    ctx.fillRect(b, b, renderer.width - (b * 2), renderer.height - (b * 2));
    ctx.fillStyle = '#eee';
    ctx.fillRect(b * 2, b * 2, renderer.width - (b * 4), renderer.height - (b * 4));
    ctx.fillStyle = '#000';
    ctx.fillText(text.toUpperCase(), renderer.width * 0.5, renderer.height * 0.5);
    texture.needsUpdate = true;
  }
}

export default Display;
