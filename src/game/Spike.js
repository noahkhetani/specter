import * as THREE from 'three';

const PLANT_TIME = 4.0;      // seconds to plant
const DEFUSE_TIME = 7.0;     // full defuse
const DEFUSE_HALF = 3.5;     // half defuse checkpoint
const SPIKE_TIMER = 45.0;    // detonation countdown

export class Spike {
  constructor(game) {
    this.game = game;

    this.state = 'carried';   // carried | dropped | planting | planted | defusing | defused | exploded
    this.carrier = null;      // who holds it (player or bot)
    this.position = new THREE.Vector3();
    this.plantedSite = null;

    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.detonationTimer = SPIKE_TIMER;
    this.planter = null;

    this._buildMesh();
    this._buildPlantedMesh();
  }

  _buildMesh() {
    // Dropped spike pickup
    this.group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.15, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x882222, metalness: 0.5, roughness: 0.4 })
    );
    this.group.add(body);
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 })
    );
    light.position.set(0, 0.1, 0);
    this.group.add(light);
    this._dropLight = light;
    this.group.visible = false;
    this.game.scene.add(this.group);
  }

  _buildPlantedMesh() {
    this.plantedGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x661111, metalness: 0.6, roughness: 0.3 })
    );
    body.position.y = 0.3;
    this.plantedGroup.add(body);

    this._blinkLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 })
    );
    this._blinkLight.position.y = 0.65;
    this.plantedGroup.add(this._blinkLight);

    this._pointLight = new THREE.PointLight(0xff0000, 1, 5);
    this._pointLight.position.y = 0.7;
    this.plantedGroup.add(this._pointLight);

    this.plantedGroup.visible = false;
    this.game.scene.add(this.plantedGroup);
  }

  reset() {
    this.state = 'carried';
    this.carrier = null;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.detonationTimer = SPIKE_TIMER;
    this.plantedSite = null;
    this.planter = null;
    this.group.visible = false;
    this.plantedGroup.visible = false;
    this.game.hud.setSpikeTimer(false);
    this.game.hud.setPlantProgress(false);
  }

  giveToPlayer() {
    this.state = 'carried';
    this.carrier = this.game.player;
    this.game.hud.setSpikeCarrier(true);
  }

  giveToBot(bot) {
    this.state = 'carried';
    this.carrier = bot;
    bot.hasSpike = true;
  }

  drop(position) {
    this.state = 'dropped';
    this.carrier = null;
    this.position.copy(position).setY(0.15);
    this.group.position.copy(this.position);
    this.group.visible = true;
    this.game.hud.setSpikeCarrier(false);
  }

  playerHasSpike() {
    return this.carrier === this.game.player;
  }

  // ─── Player plant interaction ───
  update(dt, input) {
    // Blink dropped spike
    if (this.state === 'dropped') {
      this._dropLight.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      // Player pickup
      const pPos = this.game.player.getPosition();
      if (this.game.player.team === 'attacker' &&
          pPos.distanceTo(this.position.clone().setY(0)) < 1.5) {
        this.giveToPlayer();
        this.group.visible = false;
        this.game.hud.showNotification('SPIKE ACQUIRED');
      }
    }

    // Planting (player)
    if (this.state === 'carried' && this.playerHasSpike()) {
      const site = this.game.map.getNearestSite(this.game.player.getPosition());
      const inSite = this.game.map.isInSite(this.game.player.getPosition(), site);

      if (inSite && this.game.player.alive) {
        this.game.hud.setInteractPrompt('HOLD [4] TO PLANT');
        if (input.isKey('Digit4') || input.isKey('KeyF')) {
          this.plantProgress += dt;
          this.game.hud.setPlantProgress(true, this.plantProgress / PLANT_TIME, 'PLANTING');
          if (this.plantProgress >= PLANT_TIME) {
            this._completePlant(site, this.game.player);
          }
        } else {
          this.plantProgress = Math.max(0, this.plantProgress - dt * 2);
          this.game.hud.setPlantProgress(false);
        }
      } else {
        this.game.hud.setInteractPrompt(null);
        this.game.hud.setPlantProgress(false);
        this.plantProgress = 0;
      }
    }

    // Planted — countdown & defuse
    if (this.state === 'planted' || this.state === 'defusing') {
      this.detonationTimer -= dt;

      // Blink faster as time runs out
      const blinkSpeed = this.detonationTimer < 10 ? 0.02 : 0.006;
      this._blinkLight.material.emissiveIntensity = 0.3 + Math.abs(Math.sin(Date.now() * blinkSpeed)) * 0.9;
      this._pointLight.intensity = 0.5 + Math.abs(Math.sin(Date.now() * blinkSpeed)) * 1.5;

      // Beep
      if (!this._lastBeep || Date.now() - this._lastBeep > (this.detonationTimer < 10 ? 250 : 800)) {
        this.game.audio.play('spike_beep', { volume: 0.3 });
        this._lastBeep = Date.now();
      }

      this.game.hud.setSpikeTimer(true, this.detonationTimer, SPIKE_TIMER);

      // Defuse (defender / player if defender)
      const pPos = this.game.player.getPosition();
      const nearSpike = pPos.distanceTo(this.position.clone().setY(0)) < 1.5;

      if (this.game.player.team === 'defender' && nearSpike && this.game.player.alive) {
        this.game.hud.setInteractPrompt('HOLD [F] TO DEFUSE');
        if (input.isKey('KeyF') || input.isKey('Digit4')) {
          this.state = 'defusing';
          this.defuseProgress += dt;
          this.game.hud.setPlantProgress(true, this.defuseProgress / DEFUSE_TIME, 'DEFUSING');
          if (this.defuseProgress >= DEFUSE_TIME) {
            this._completeDefuse();
          }
        } else {
          this.state = 'planted';
          this.game.hud.setPlantProgress(false);
          // Defuse persists at half checkpoint
          if (this.defuseProgress < DEFUSE_HALF) this.defuseProgress = 0;
          else this.defuseProgress = DEFUSE_HALF;
        }
      } else {
        this.game.hud.setInteractPrompt(null);
      }

      // Detonate
      if (this.detonationTimer <= 0) {
        this._explode();
      }
    }
  }

  _completePlant(site, planter) {
    this.state = 'planted';
    this.plantedSite = site;
    this.planter = planter;
    this.detonationTimer = SPIKE_TIMER;

    const sitePos = this.game.player.getPosition();
    this.position.copy(sitePos).setY(0);
    this.plantedGroup.position.copy(this.position);
    this.plantedGroup.visible = true;

    if (planter === this.game.player) {
      this.game.hud.setSpikeCarrier(false);
      this.game.gameManager.addCredits(300);   // plant bonus
    }

    this.game.audio.play('spike_plant');
    this.game.hud.showNotification('SPIKE PLANTED');
    this.game.hud.setPlantProgress(false);
    this.game.hud.setInteractPrompt(null);
    this.game.gameManager.onSpikePlanted();
  }

  _completeDefuse() {
    this.state = 'defused';
    this.plantedGroup.visible = false;
    this.game.audio.play('spike_defuse');
    this.game.hud.showNotification('SPIKE DEFUSED');
    this.game.hud.setPlantProgress(false);
    this.game.hud.setSpikeTimer(false);
    this.game.gameManager.onSpikeDefused();
  }

  _explode() {
    this.state = 'exploded';
    this.plantedGroup.visible = false;
    this.game.audio.play('spike_explode');
    this.game.particles.spawnExplosion(this.position.clone().setY(1));

    // Damage in radius
    const blastRadius = 12;
    const pDist = this.game.player.getPosition().distanceTo(this.position.clone().setY(0));
    if (pDist < blastRadius && this.game.player.team === 'defender' && this.game.player.alive) {
      this.game.player.takeDamage(200, this.position.clone(), false);
    }

    // Screen shake
    this.game.shakeCamera(1.0);

    this.game.hud.setSpikeTimer(false);
    this.game.gameManager.onSpikeExploded();
  }

  // ─── Bot plant ───
  botStartPlant(bot) {
    if (this.state !== 'carried' || this.carrier !== bot) return;
    if (bot._planting) return;
    bot._planting = true;

    const site = this.game.map.getNearestSite(bot.position);
    let progress = 0;
    const interval = setInterval(() => {
      if (!bot.alive || !this.game.gameManager.roundActive) {
        clearInterval(interval);
        bot._planting = false;
        return;
      }
      progress += 0.1;
      if (progress >= PLANT_TIME) {
        clearInterval(interval);
        bot._planting = false;
        bot.hasSpike = false;
        // plant at bot position
        this.state = 'planted';
        this.plantedSite = site;
        this.planter = bot;
        this.detonationTimer = SPIKE_TIMER;
        this.position.copy(bot.position).setY(0);
        this.plantedGroup.position.copy(this.position);
        this.plantedGroup.visible = true;
        this.game.audio.play('spike_plant');
        this.game.hud.showNotification('SPIKE PLANTED');
        this.game.gameManager.onSpikePlanted();
      }
    }, 100);
  }
}
