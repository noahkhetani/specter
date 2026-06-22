export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      this.enabled = false;
    }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _noise(duration, freq, type = 'sawtooth', gainVal = 0.3, detune = 0) {
    if (!this.enabled) return;
    this._resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _whitenoise(duration, gainVal = 0.2) {
    if (!this.enabled) return;
    this._resume();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  play(sound, options = {}) {
    const vol = options.volume ?? 1;
    const pitch = options.pitch ?? 1;

    switch (sound) {
      case 'shoot_pistol':
        this._whitenoise(0.08, 0.4 * vol);
        this._noise(0.12, 200 * pitch, 'sawtooth', 0.3 * vol);
        break;
      case 'shoot_rifle':
        this._whitenoise(0.06, 0.5 * vol);
        this._noise(0.10, 150 * pitch, 'sawtooth', 0.35 * vol);
        break;
      case 'shoot_shotgun':
        this._whitenoise(0.15, 0.6 * vol);
        this._noise(0.18, 100 * pitch, 'sawtooth', 0.4 * vol);
        break;
      case 'shoot_sniper':
        this._whitenoise(0.12, 0.7 * vol);
        this._noise(0.25, 80 * pitch, 'sawtooth', 0.5 * vol);
        break;
      case 'shoot_smg':
        this._whitenoise(0.05, 0.35 * vol);
        this._noise(0.08, 180 * pitch, 'square', 0.25 * vol);
        break;
      case 'reload':
        this._noise(0.1, 800, 'sine', 0.15 * vol);
        setTimeout(() => this._noise(0.08, 1200, 'sine', 0.1 * vol), 200);
        break;
      case 'empty_click':
        this._noise(0.05, 2000, 'sine', 0.1 * vol);
        break;
      case 'hit_marker':
        this._noise(0.08, 3500, 'sine', 0.2 * vol);
        break;
      case 'kill_confirm':
        this._noise(0.05, 3500, 'sine', 0.25 * vol);
        setTimeout(() => this._noise(0.06, 4200, 'sine', 0.2 * vol), 60);
        break;
      case 'footstep':
        this._whitenoise(0.05, 0.06 * vol);
        break;
      case 'jump':
        this._noise(0.1, 300, 'sine', 0.15 * vol);
        break;
      case 'land':
        this._whitenoise(0.08, 0.15 * vol);
        break;
      case 'buy_success':
        this._noise(0.08, 600, 'sine', 0.2 * vol);
        setTimeout(() => this._noise(0.1, 800, 'sine', 0.2 * vol), 80);
        break;
      case 'round_start':
        this._noise(0.2, 440, 'sine', 0.3 * vol);
        setTimeout(() => this._noise(0.2, 660, 'sine', 0.3 * vol), 180);
        break;
      case 'round_win':
        [0, 100, 200, 350].forEach((t, i) => {
          const freqs = [440, 550, 660, 880];
          setTimeout(() => this._noise(0.2, freqs[i], 'sine', 0.3 * vol), t);
        });
        break;
      case 'round_lose':
        this._noise(0.3, 220, 'sawtooth', 0.2 * vol);
        break;
      case 'spike_plant':
        [0, 150, 300].forEach((t, i) => {
          setTimeout(() => this._noise(0.15, [440, 550, 440][i], 'sine', 0.35 * vol), t);
        });
        break;
      case 'spike_beep':
        this._noise(0.12, 880, 'sine', 0.3 * vol);
        break;
      case 'spike_defuse':
        [0, 100, 200, 300].forEach((t, i) => {
          setTimeout(() => this._noise(0.12, [440, 550, 660, 880][i], 'sine', 0.3 * vol), t);
        });
        break;
      case 'spike_explode':
        this._whitenoise(0.8, 0.8 * vol);
        this._noise(0.5, 60, 'sawtooth', 0.6 * vol);
        break;
      case 'ability_use':
        this._noise(0.15, 500, 'sine', 0.2 * vol);
        break;
      case 'smoke_deploy':
        this._whitenoise(0.3, 0.2 * vol);
        break;
      case 'flash_bang':
        this._noise(0.6, 8000, 'sine', 0.4 * vol);
        break;
      case 'headshot':
        this._noise(0.05, 5000, 'sine', 0.3 * vol);
        this._whitenoise(0.05, 0.2 * vol);
        break;
      case 'wall_impact':
        this._whitenoise(0.05, 0.1 * vol);
        break;
      case 'game_win':
        [0, 200, 400, 600, 900].forEach((t, i) => {
          const freqs = [440, 550, 660, 770, 880];
          setTimeout(() => this._noise(0.3, freqs[i], 'sine', 0.35 * vol), t);
        });
        break;
    }
  }

  setVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = v;
  }
}
