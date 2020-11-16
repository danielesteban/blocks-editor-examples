import { PositionalAudio } from '../core/three.js';
import Voice from '../core/voice.js';
import Box from './box.js';

class Pad extends Box {
  constructor({
    listener,
    note,
    sample,
    sfx,
  }) {
    super(1, 1, 0.2);
    if (sample) {
      sfx.load(sample)
        .then((sound) => {
          this.add(sound);
          this.sound = sound;
        });
    } else {
      const sound = new PositionalAudio(listener);
      this.voice = new Voice({
        context: sound.context,
        note,
        waves: [
          { type: 'sawtooth', offset: 0 },
          { type: 'sine', offset: 7 },
          { type: 'square', offset: 12 },
        ],
      });
      sound.setNodeSource(this.voice.output);
      const filter = sound.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2048;
      sound.setFilter(filter);
      this.add(sound);
      this.sound = sound;
    }
    this.material = this.material.clone();
    this.hue = (note % 12) / 12;
    this.power = 0;
    this.updateColor();
  }

  animate({ delta }) {
    const { power } = this;
    if (power === 0) {
      return;
    }
    this.power = Math.max(power - delta * 4, 0);
    this.updateColor();
  }

  onContact() {
    const { power, sound, voice } = this;
    if (!sound || sound.context.state !== 'running' || power !== 0) {
      return;
    }
    this.power = 1;
    this.updateColor();
    if (voice) {
      voice.trigger();
    } else {
      sound.play();
    }
  }

  updateColor() {
    const { hue, material, power } = this;
    material.color.setHSL(hue, 1, Math.max(Math.min(power, 0.9), 0.1));
  }
}

export default Pad;
