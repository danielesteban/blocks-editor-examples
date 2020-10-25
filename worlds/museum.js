import ElevatorWorld from '../core/elevatorWorld.js';
import {
  Color,
  Euler,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Artwork from '../renderables/artwork.js';

class Museum extends ElevatorWorld {
  constructor(scene, { offset }) {
    super({
      scene,
      offset,
      position: new Vector3(0, 0.5, -1.75),
      rotation: new Euler(0, Math.PI, 0),
    });

    const { ambient, models, player, translocables } = scene;
    ambient.set('sounds/museum.ogg');
    scene.background = new Color(0x6699AA);

    const artwork = new Artwork({
      artworks: Museum.artworks,
      models,
    });
    artwork.position.set(0, 5.5, -12.75);
    this.artwork = artwork;
    this.add(artwork);

    models.load('models/museum.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });
        this.add(model);
        this.elevator.isOpen = true;
        this.elevator.onClose = () => (
          scene.load('Metro', { destination: 'Museum', offset: this.elevator.getOffset(player) })
        );
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const { artwork, isOnElevator, player } = this;
    artwork.animate(animation);
    if (isOnElevator) {
      return;
    }
    player.controllers.forEach(({
      buttons,
      hand,
      raycaster,
    }) => {
      if (hand && buttons.triggerDown) {
        artwork.next();
      }
    });
  }
}

Museum.artworks = [
  {
    title: 'Joan of Arc',
    image: '435621/1728774'
  },
  {
    title: 'Washington Crossing the Delaware',
    image: '11417/42494'
  },
  {
    title: 'Mars and Venus United by Love',
    image: '437891/797737'
  },
  {
    title: 'Allegory of the Catholic Faith',
    image: '437877/795793'
  },
  {
    title: 'Soap Bubbles',
    image: '435888/1507010'
  },
  {
    title: 'Hermann von Wedigh III (died 1560)',
    image: '436658/797342'
  },
  {
    title: 'The Lovers',
    image: '451023/904153'
  },
  {
    title: 'Terracotta funerary plaque',
    image: '254801/539744'
  },
  {
    title: 'Aristotle with a Bust of Homer',
    image: '437394/1328682'
  },
  {
    title: 'Juan de Pareja (1606–1670)',
    image: '437869/1763004'
  },
  {
    title: 'The Annunciation',
    image: '459016/913345'
  },
  {
    title: 'Saint Jerome as Scholar',
    image: '459088/913475'
  },
  {
    title: 'Joséphine-Éléonore-Marie-Pauline de Galard de Brassac de Béarn (1825–1860), Princesse de Broglie',
    image: '459106/1964622'
  },
  {
    title: 'Old Plum',
    image: '44858/148433'
  },
  {
    title: 'Night-Shining White',
    image: '39901/148136'
  },
  {
    title: 'Outing to Zhang Gong&#39;s Grotto',
    image: '49177/198938'
  },
  {
    title: 'The House of Bijapur',
    image: '453183/903108'
  },
  {
    title: 'The Dance Class',
    image: '438817/796418'
  },
  {
    title: 'Double Diptych Icon Pendant',
    image: '317829/670148'
  }
];

Museum.display = 'Museum';

export default Museum;
