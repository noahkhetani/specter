import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createComposer, resizeComposer } from './effects/PostProcessing.js';
import { EventBus } from './core/EventBus.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { MapSystem } from './map/MapSystem.js';
import { Player } from './entities/Player.js';
import { Bot } from './entities/Bot.js';
import { WeaponSystem } from './weapons/WeaponSystem.js';
import { AbilitySystem } from './abilities/AbilitySystem.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { Spike } from './game/Spike.js';
import { GameManager } from './game/GameManager.js';
import { HUD } from './ui/HUD.js';
import { BuyMenu } from './ui/BuyMenu.js';
import { Scoreboard } from './ui/Scoreboard.js';
import { Minimap } from './ui/Minimap.js';
import { AGENTS, AGENT_LIST } from './config/agents.js';
import { WEAPONS } from './config/weapons.js';

class Game {
  constructor() {
    this.state = 'menu';   // menu | agentselect | playing | gameover
    this.selectedAgent = AGENTS.swift;
    this.events = new EventBus();

    this.canvas = document.getElementById('game-canvas');
    this._initThree();

    this.audio = new AudioManager();
    this.input = new InputManager(this.canvas);

    this.clock = new THREE.Clock();
    this.bots = [];

    this._shake = 0;
    this._botKillStats = {};

    this._bindUI();
    this._loadingSequence();
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 300);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Filmic tone mapping for a realistic, non-flat look
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.composer) resizeComposer(this.composer, window.innerWidth, window.innerHeight);
    });
  }

  _initEnvironment() {
    // Image-based lighting so PBR materials (esp. metals) read correctly
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }

  _loadingSequence() {
    const bar = document.getElementById('load-bar');
    const text = document.getElementById('load-text');
    const steps = [
      [20, 'LOADING MAP: VERTEX...'],
      [45, 'SPAWNING AGENTS...'],
      [70, 'CALIBRATING WEAPONS...'],
      [90, 'ESTABLISHING CONNECTION...'],
      [100, 'READY'],
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) {
        setTimeout(() => {
          document.getElementById('loading-screen').style.display = 'none';
          document.getElementById('main-menu').classList.remove('hidden');
        }, 400);
        return;
      }
      const [pct, msg] = steps[i++];
      bar.style.width = pct + '%';
      text.textContent = msg;
      setTimeout(tick, 350);
    };
    tick();
  }

  // ─── UI Binding ───
  _bindUI() {
    document.getElementById('btn-play').addEventListener('click', () => this._showAgentSelect(false));
    document.getElementById('btn-training').addEventListener('click', () => this._showAgentSelect(true));
    document.getElementById('confirm-agent').addEventListener('click', () => this._startMatch());
    document.getElementById('play-again-btn').addEventListener('click', () => location.reload());

    this._buildAgentSelect();
  }

  _buildAgentSelect() {
    const grid = document.getElementById('agent-grid');
    grid.innerHTML = AGENT_LIST.map((a, i) => `
      <div class="agent-card ${i === 0 ? 'selected' : ''}" data-agent="${a.id}">
        <div class="agent-icon" style="background:${a.color}">${a.emoji}</div>
        <div class="agent-name">${a.name}</div>
        <div class="agent-role">${a.role}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedAgent = AGENTS[card.dataset.agent];
        this._renderAgentInfo();
      });
    });

    this.selectedAgent = AGENT_LIST[0];
    this._renderAgentInfo();
  }

  _renderAgentInfo() {
    const a = this.selectedAgent;
    document.getElementById('selected-agent-name').textContent = a.name;
    document.getElementById('selected-agent-name').style.color = a.color;
    document.getElementById('selected-agent-role').textContent = a.role;
    document.getElementById('selected-agent-desc').textContent = a.description;

    const preview = document.getElementById('ability-preview');
    preview.innerHTML = ['c', 'q', 'e', 'x'].map(k => {
      const ab = a.abilities[k];
      return `
        <div class="ability-chip">
          <div class="key">${k.toUpperCase()}</div>
          <div class="icon">${ab.icon}</div>
          <div class="name">${ab.name}</div>
        </div>
      `;
    }).join('');
  }

  _showAgentSelect(isTraining) {
    this.isTraining = isTraining;
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('agent-select').classList.remove('hidden');
  }

  // ─── Match Setup ───
  _startMatch() {
    document.getElementById('agent-select').classList.add('hidden');

    // Image-based lighting for PBR materials
    this._initEnvironment();

    // Build all systems
    this.map = new MapSystem(this);
    this.particles = new ParticleSystem(this);
    this.player = new Player(this);
    this.player.team = 'attacker';
    this.hud = new HUD(this);
    this.weaponSystem = new WeaponSystem(this);
    this.abilitySystem = new AbilitySystem(this);
    this.abilitySystem.setAgent(this.selectedAgent);
    this.spike = new Spike(this);
    this.buyMenu = new BuyMenu(this);
    this.scoreboard = new Scoreboard(this);
    this.minimap = new Minimap(this);
    this.gameManager = new GameManager(this);

    // Spawn bots — 4 teammates (attacker) + 5 enemies (defender)
    this._spawnBots();

    this.hud.show();
    this.state = 'playing';

    // Give starting pistol
    this.weaponSystem.resetLoadout();
    this.hud.updateHealth(100, 0, 0);
    this.hud.updateAbilities(this.selectedAgent, this.abilitySystem.charges, 0, this.abilitySystem.ultRequired);

    // Post-processing pipeline (AO + bloom + filmic output)
    this.composer = createComposer(this.renderer, this.scene, this.camera);

    // Start game loop
    this.gameManager.start();
    this.clock.start();
    this.canvas.requestPointerLock();
    this._loop();
  }

  _spawnBots() {
    this.bots = [];
    // 4 attacker teammates
    for (let i = 0; i < 4; i++) {
      const bot = new Bot(this, 'attacker', i);
      bot.kills = 0; bot.deaths = 0; bot.assists = 0; bot.credits = 800;
      this.bots.push(bot);
    }
    // 5 defenders (enemies)
    for (let i = 0; i < 5; i++) {
      const bot = new Bot(this, 'defender', i);
      bot.kills = 0; bot.deaths = 0; bot.assists = 0; bot.credits = 800;
      this.bots.push(bot);
    }
    this.gameManager.bots = this.bots;
  }

  resetRound() {
    // Respawn player
    const team = this.player.team;
    const spawnIdx = 0;
    const spawn = this.map.getSpawnPoint(team, spawnIdx);
    this.player.reset(spawn);
    this.hud.hideDeath();
    this.hud.updateHealth(this.player.health, this.player.armor, this.player.maxArmor);

    // Respawn bots
    let attIdx = team === 'attacker' ? 1 : 0;
    let defIdx = team === 'defender' ? 1 : 0;
    for (const bot of this.bots) {
      if (bot.team === 'attacker') {
        bot.spawn(this.map.getSpawnPoint('attacker', attIdx++));
      } else {
        bot.spawn(this.map.getSpawnPoint('defender', defIdx++));
      }
      bot.hasSpike = false;
    }

    // Clear abilities/effects
    this.abilitySystem.clearAll();
    this.weaponSystem.refillAll();
    this.weaponSystem.equip(this.weaponSystem.loadout.primary ? 'primary' : 'sidearm');
  }

  swapBotTeams() {
    for (const bot of this.bots) {
      bot.team = bot.team === 'attacker' ? 'defender' : 'attacker';
      // Rebuild mesh color
      const teamColor = bot.team === 'attacker' ? 0xff4655 : 0x4A90D9;
      bot.torso.material.color.setHex(teamColor);
    }
  }

  // ─── Combat callbacks ───
  canPlayerAct() {
    return this.state === 'playing' &&
           !this.buyMenu.isOpen &&
           this.input.isPointerLocked;
  }

  onPlayerDeath() {
    this.audio.play('round_lose', { volume: 0.3 });
    // Find killer name
    this.hud.showDeath('Enemy');
    this.gameManager.stats.deaths++;
    this.gameManager._checkEliminationWin();
  }

  onBotKilled(bot, killer, isHeadshot) {
    bot.deaths = (bot.deaths || 0) + 1;

    const weaponName = killer === this.player
      ? this.weaponSystem.getCurrentWeapon().name
      : 'Rifle';

    const killerName = killer === this.player ? 'YOU' : (killer && killer.name) || 'Enemy';
    const isPlayerKill = killer === this.player;

    if (killer === this.player) {
      this.gameManager.stats.kills++;
    } else if (killer && killer.kills !== undefined) {
      killer.kills++;
    }

    this.hud.addKillFeed(killerName, bot.name, weaponName, isHeadshot, isPlayerKill);
    this.gameManager.onKill(killer, bot);
  }

  shakeCamera(amount) {
    this._shake = Math.max(this._shake, amount);
  }

  getWeaponName(id) {
    return WEAPONS[id] ? WEAPONS[id].name : id;
  }

  onGameOver(playerWon, scores) {
    this.state = 'gameover';
    this.input.unlockPointer();
    this.hud.hide();
    const go = document.getElementById('game-over');
    const result = document.getElementById('final-result');
    result.textContent = playerWon ? 'VICTORY' : 'DEFEAT';
    result.className = 'final-result ' + (playerWon ? 'victory' : 'defeat');
    document.getElementById('final-score').textContent =
      `${scores.attacker} — ${scores.defender}  |  ${this.gameManager.stats.kills} Kills / ${this.gameManager.stats.deaths} Deaths`;
    go.classList.add('active');
  }

  // ─── Main Loop ───
  _loop() {
    if (this.state !== 'playing') {
      if (this.state === 'gameover') return;
    }
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(0.05, this.clock.getDelta());

    // Global input handling
    this._handleGlobalInput();

    if (this.state === 'playing') {
      // Update systems
      if (this.canPlayerAct()) {
        this.player.update(dt, this.input);
        this.weaponSystem.update(dt, this.input);
        this._handleAbilityInput();
      } else {
        // Still update player camera but not movement when menu open
        this.player.update(dt, { ...this.input, isPointerLocked: false, isKey: () => false, wasKeyPressed: () => false, wasKeyReleased: () => false, mouse: { dx: 0, dy: 0, justClicked: false, justRightClicked: false, buttons: 0 }, scrollDelta: 0 });
      }

      for (const bot of this.bots) bot.update(dt);
      this.abilitySystem.update(dt);
      this.particles.update(dt);
      this.spike.update(dt, this.input);
      this.map.update(dt);
      this.gameManager.update(dt);
      this.minimap.update();

      // Flash blindness overlay
      if (this.player.flashAmount > 0) {
        this.hud.setFlashBlind(this.player.flashAmount);
      } else {
        document.getElementById('flash-overlay').style.opacity = '0';
      }

      // Crosshair spread when moving/shooting
      const moving = Math.hypot(this.player.velocity.x, this.player.velocity.z) > 2;
      this.hud.setCrosshairSpread(moving && !this.player.isCrouching);
    }

    // Camera shake
    if (this._shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this._shake * 0.3;
      this.camera.position.y += (Math.random() - 0.5) * this._shake * 0.3;
      this._shake = Math.max(0, this._shake - dt * 3);
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.input.flush();
  }

  _handleGlobalInput() {
    // Buy menu toggle (B)
    if (this.input.wasKeyPressed('KeyB')) {
      if (this.gameManager && this.gameManager.phase === 'buy') {
        this.buyMenu.toggle();
      } else if (this.buyMenu && this.buyMenu.isOpen) {
        this.buyMenu.close();
      }
    }

    // ESC closes menus
    if (this.input.wasKeyPressed('Escape')) {
      if (this.buyMenu && this.buyMenu.isOpen) this.buyMenu.close();
    }

    // Scoreboard (Tab)
    if (this.scoreboard) {
      if (this.input.isKey('Tab') && !this.scoreboard.isOpen) {
        this.scoreboard.open();
      } else if (!this.input.isKey('Tab') && this.scoreboard.isOpen) {
        this.scoreboard.close();
      }
    }
  }

  _handleAbilityInput() {
    if (!this.canPlayerAct()) return;
    if (this.input.wasKeyPressed('KeyC')) this.abilitySystem.use('c');
    if (this.input.wasKeyPressed('KeyQ')) this.abilitySystem.use('q');
    if (this.input.wasKeyPressed('KeyE')) this.abilitySystem.use('e');
    if (this.input.wasKeyPressed('KeyX')) this.abilitySystem.use('x');
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.GAME = new Game();
});
