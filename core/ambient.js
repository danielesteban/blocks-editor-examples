// Ambient sound system

class Ambient {
  constructor(isRunning) {
    this.isRunning = isRunning;
    this.sounds = [];
  }
  
  resume() {
    const { sounds } = this;
    this.isRunning = true;
    sounds.forEach((sound) => (
      sound.play()
    ));
  }

  set(sound, gain = 0.2) {
    const { isRunning, sounds } = this;
    
    sounds.forEach((sound) => {
      sound.fadeIn = false;
      sound.fadeOut = true;
    });

    if (sound) {
      const player = document.createElement('audio');
      player.fadeIn = true;
      player.loop = true;
      player.src = sound;
      player.gain = gain;
      player.power = 0;
      player.volume = 0;
      sounds.push(player);
      if (isRunning) {
        player.play();
      }
    }
  }

  onAnimationTick({ delta }) {
    const { isRunning, sounds } = this;
    if (!isRunning) {
      return;
    }
    const step = delta * 0.5;
    let count = sounds.length;
    for (let i = 0; i < count; i += 1) {
      const sound = sounds[i];
      if (sound.fadeIn || sound.fadeOut) {
        if (sound.fadeIn) {
          sound.power += step;
          if (sound.power >= 1) {
            sound.power = 1;
            sound.fadeIn = false;
          }
        }
        if (sound.fadeOut) {
          sound.power -= step;
          if (sound.power <= 0) {
            sound.pause();
            sound.src = '';
            sounds.splice(i, 1);
            i -= 1;
            count -= 1;
            break;
          }
        }
        sound.volume = Math.cos((1.0 - sound.power) * 0.5 * Math.PI) * sound.gain;
      }
    }
  }
}

export default Ambient;
