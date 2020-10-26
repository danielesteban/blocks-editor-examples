import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Artwork extends Mesh {
  static setupGeometry() {
    Artwork.geometry = new PlaneBufferGeometry(6, 6);
  }

  static setupMaterial() {
    Artwork.renderer = document.createElement('canvas');
    Artwork.renderer.width = 1024;
    Artwork.renderer.height = 1024;
    Artwork.material = new MeshBasicMaterial({
      map: new CanvasTexture(Artwork.renderer),
      alphaTest: 1,
    });
  }

  constructor({ artworks, models }) {
    if (!Artwork.geometry) {
      Artwork.setupGeometry();
    }
    if (!Artwork.renderer || !Artwork.material) {
      Artwork.setupMaterial();
    }
    super(
      Artwork.geometry,
      Artwork.material
    );
    this.artworks = [...artworks];
    const values = window.crypto.getRandomValues(new Uint32Array(this.artworks.length));
    for (let i = this.artworks.length - 1; i >= 0; i -= 1) {
      const rand = values[i] % (i + 1);
      const temp = this.artworks[i];
      this.artworks[i] = this.artworks[rand];
      this.artworks[rand] = temp;
    }
    this.index = 0;
    this.isOpen = false;
    models.load('models/museumDoor.glb')
      .then((model) => {
        this.doors = [
          { open: -4.375, closed: -1.5 },
          { open: 4.375, closed: 1.5 },
        ].map((animation) => {
          const door = model.clone();
          door.animation = animation;
          door.position.set(animation.closed, -5.5, 6.375);
          door.scale.set(0.5, 0.5, 0.25);
          this.add(door);
          return door;
        });
      });
  }
  
  animate(animation) {
    const { artworks, doors, index, isOpen } = this;
    if (doors) {
      const { delta } = animation;
      doors.forEach(({ animation, position }) => {
        let diff;
        if (isOpen && position.x != animation.open) {
          diff = animation.open - position.x;
        }
        if (!isOpen && position.x != animation.closed) {
          diff = animation.closed - position.x;
        }
        if (diff) {
          const step = delta * 4;
          position.x += Math.min(Math.max(diff, -step), step);
        } else if (!isOpen && !this.isLoading) {
          this.isLoading = true;
          const { image } = artworks[index];
          Artwork
            .update(`https://collectionapi.metmuseum.org/api/collection/v1/iiif/${image}/main-image`)
            .then(() => {
              this.isLoading = false;
              this.isOpen = true;
            });
        }
      });
    }
  }

  next() {
    const { artworks, index, isOpen } = this;
    if (!isOpen) {
      return;
    }
    this.index = (index + 1) % artworks.length;
    this.isOpen = false;
  }

  static update(image) {
    if (!Artwork.renderer || !Artwork.material) {
      Artwork.setupMaterial();
    }
    return new Promise((resolve) => {
      const { renderer, material } = Artwork;
      const loader = new Image();
      loader.crossOrigin = 'anonymous';
      loader.onload = () => {
        const ctx = renderer.getContext('2d');
        ctx.clearRect(0, 0, renderer.width, renderer.height);
        const aspect = loader.width / loader.height;
        let x = 0;
        let y = 0;
        let w = renderer.width;
        let h = renderer.height;
        if (aspect < 1) {
          w = loader.width * renderer.height / loader.height;
          x = renderer.width * 0.5 - w * 0.5;
        } else {
          h = loader.height * renderer.width / loader.width;
          y = renderer.height * 0.5 - h * 0.5;
        }
        ctx.drawImage(loader, x, y, w, h);
        material.map.needsUpdate = true;
        resolve();
      };
      loader.src = image;
    });
  }
}

export default Artwork;
