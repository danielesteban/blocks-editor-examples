import Renderer from './core/renderer.js';
import * as worlds from './worlds/index.js';

const renderer = new Renderer({
  dom: {
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    renderer: document.getElementById('renderer'),
    support: document.getElementById('support'),
  },
  worlds,
});

const loadWorldFromURL = () => {
  let world = 'Metro';
  if (document.location.hash) {
    const requested = document.location.hash.substr(2);
    if (worlds[requested]) {
      world = requested;
    }
  }
  renderer.scene.load(world);
};

window.addEventListener('popstate', loadWorldFromURL);
loadWorldFromURL();
