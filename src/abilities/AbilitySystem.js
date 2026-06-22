import * as THREE from 'three';

// Manages ability charges, cooldowns, and active world effects
export class AbilitySystem {
  constructor(game) {
    this.game = game;
    this.agent = null;

    // Charges & cooldowns per slot
    this.charges = { c: 0, q: 0, e: 0, x: 0 };
    this.cooldowns = { c: 0, q: 0, e: 0, x: 0 };  // for free-charge timers
    this.ultPoints = 0;
    this.ultRequired = 7;

    // Active world effects
    this.smokes = [];        // { mesh, position, radius, life }
    this.walls = [];
    this.activeEffects = [];

    this._tmpV = new THREE.Vector3();
  }

  setAgent(agent) {
    this.agent = agent;
    this.ultRequired = agent.abilities.x.ultPoints;
    this.resetCharges();
  }

  resetCharges() {
    // Buy-phase reset: signature ability gets free charge
    const ab = this.agent.abilities;
    this.charges.c = 0;
    this.charges.q = 0;
    this.charges.e = ab.e.freeCharge ? 1 : 0;
    this.cooldowns = { c: 0, q: 0, e: 0, x: 0 };
    this._updateHUD();
  }

  buyAbility(slot) {
    const ab = this.agent.abilities[slot];
    if (this.charges[slot] >= ab.charges) return false;
    if (this.game.gameManager.credits < ab.price) return false;
    this.game.gameManager.spendCredits(ab.price);
    this.charges[slot]++;
    this._updateHUD();
    return true;
  }

  addUltPoint() {
    if (this.ultPoints < this.ultRequired) {
      this.ultPoints++;
      if (this.ultPoints >= this.ultRequired) {
        this.charges.x = 1;
        this.game.hud.showNotification('ULTIMATE READY');
        this.game.audio.play('ability_use');
      }
      this._updateHUD();
    }
  }

  canUse(slot) {
    if (slot === 'x') return this.ultPoints >= this.ultRequired && this.charges.x > 0;
    return this.charges[slot] > 0;
  }

  use(slot) {
    if (!this.canUse(slot)) {
      this.game.audio.play('empty_click', { volume: 0.5 });
      return;
    }

    const ab = this.agent.abilities[slot];
    this._executeAbility(ab.type, ab);

    if (slot === 'x') {
      this.ultPoints = 0;
      this.charges.x = 0;
    } else {
      this.charges[slot]--;
    }
    this._updateHUD();
  }

  _executeAbility(type, ab) {
    const player = this.game.player;
    const forward = player.getForward();
    const origin = player.camera.getWorldPosition(new THREE.Vector3());

    this.game.audio.play('ability_use');

    switch (type) {
      case 'smoke':
      case 'firewall': {
        // Throw projectile that lands and creates smoke
        const landing = this._projectTo(origin, forward, 18);
        this._deploySmoke(landing, type === 'firewall' ? 0xff6622 : 0x445566);
        this.game.audio.play('smoke_deploy');
        break;
      }
      case 'flash': {
        const landing = this._projectTo(origin, forward, 14);
        this._deployFlash(landing);
        break;
      }
      case 'dash': {
        this._dash(forward);
        break;
      }
      case 'jump': {
        player.velocity.y = 9;
        player.onGround = false;
        break;
      }
      case 'teleport': {
        const dest = this._projectTo(origin, forward, 8);
        player.position.x = dest.x;
        player.position.z = dest.z;
        this.game.particles.spawnSmoke(dest);
        break;
      }
      case 'tpshadow': {
        // Teleport far in look direction
        const dest = this._projectTo(origin, forward, 30);
        player.position.x = dest.x;
        player.position.z = dest.z;
        this.game.particles.spawnExplosion(dest.clone().setY(1));
        this.game.hud.showNotification('FROM THE SHADOWS');
        break;
      }
      case 'wall': {
        this._deployWall(origin, forward);
        break;
      }
      case 'heal': {
        this._startHeal();
        break;
      }
      case 'slow': {
        const landing = this._projectTo(origin, forward, 14);
        this._deploySlowZone(landing);
        break;
      }
      case 'shock':
      case 'recon': {
        const landing = this._projectTo(origin, forward, 20);
        if (type === 'shock') this._shockDamage(landing);
        else this._reconReveal(landing);
        break;
      }
      case 'drone': {
        this._reconReveal(this._projectTo(origin, forward, 25));
        this.game.hud.showNotification('DRONE DEPLOYED');
        break;
      }
      case 'hotzone': {
        const landing = this._projectTo(origin, forward, 12);
        this._deployHealZone(landing);
        break;
      }
      case 'bladestorm': {
        this.game.weaponSystem.giveWeapon('knife');
        this.game.hud.showNotification('BLADE STORM');
        break;
      }
      case 'fury': {
        this._huntersFury(origin, forward);
        break;
      }
      case 'resurrect':
      case 'runback': {
        player.heal(100);
        this.game.hud.showNotification(type === 'resurrect' ? 'RESURRECTION' : 'RUN IT BACK');
        break;
      }
      default:
        break;
    }
  }

  _projectTo(origin, dir, maxDist) {
    // Raycast forward, find landing point on floor or wall
    const ray = new THREE.Raycaster(origin, dir, 0, maxDist);
    const hits = ray.intersectObjects(this.game.map.collidables, false);
    let point;
    if (hits.length > 0) {
      point = hits[0].point.clone();
    } else {
      point = origin.clone().addScaledVector(dir, maxDist);
    }
    // Drop to floor
    const down = new THREE.Raycaster(point.clone().setY(point.y + 2), new THREE.Vector3(0, -1, 0), 0, 10);
    const floorHits = down.intersectObjects(this.game.map.floorMeshes, false);
    if (floorHits.length > 0) point.y = floorHits[0].point.y;
    else point.y = Math.max(0.1, point.y);
    return point;
  }

  _deploySmoke(position, color) {
    const radius = 3.5;
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color, transparent: true, opacity: 0.0, roughness: 1,
      emissive: color, emissiveIntensity: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).setY(position.y + radius * 0.6);
    this.game.scene.add(mesh);

    const smoke = { mesh, mat, position: mesh.position.clone(), radius, life: 15, maxLife: 15, growing: true };
    this.smokes.push(smoke);

    // Particle puff
    this.game.particles.spawnSmoke(position);
  }

  _deployFlash(position) {
    // Determine if player is looking at it
    const playerPos = this.game.player.camera.getWorldPosition(new THREE.Vector3());
    const toFlash = position.clone().sub(playerPos).normalize();
    const lookDir = this.game.player.getForward();
    const dot = lookDir.dot(toFlash);

    // Visual pop
    const light = new THREE.PointLight(0xffffff, 20, 30);
    light.position.copy(position).setY(position.y + 1);
    this.game.scene.add(light);
    setTimeout(() => this.game.scene.remove(light), 200);

    this.game.audio.play('flash_bang');

    // Flash player if looking toward it and close
    const dist = playerPos.distanceTo(position);
    if (dot > 0.2 && dist < 25) {
      const intensity = dot * (1 - dist / 30);
      this.game.player.applyFlash(1.2 * intensity);
    }

    // Flash bots
    for (const bot of this.game.bots) {
      if (!bot.alive) continue;
      const bd = bot.position.distanceTo(position);
      if (bd < 20) {
        bot.reactionTimer = 1.5;  // blinded — can't shoot
        bot.accuracy *= 0.3;
        setTimeout(() => { if (bot.alive) bot.accuracy = Math.min(0.8, bot.accuracy / 0.3); }, 1500);
      }
    }
  }

  _dash(forward) {
    const player = this.game.player;
    const dashDist = 7;
    const dest = player.position.clone().addScaledVector(
      new THREE.Vector3(forward.x, 0, forward.z).normalize(), dashDist
    );
    // Simple — set velocity high
    player.velocity.x = forward.x * 30;
    player.velocity.z = forward.z * 30;
    this.game.particles.spawnSmoke(player.getPosition().setY(0.5));
  }

  _deployWall(origin, forward) {
    const base = this._projectTo(origin, forward, 8);
    const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();

    const geo = new THREE.BoxGeometry(6, 3, 0.4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.6,
      emissive: 0x4499cc, emissiveIntensity: 0.3,
    });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.copy(base).setY(1.5);
    wall.lookAt(base.clone().add(right));
    this.game.scene.add(wall);
    this.game.map.collidables.push(wall);

    this.walls.push({ mesh: wall, life: 12 });
  }

  _startHeal() {
    let healed = 0;
    const interval = setInterval(() => {
      if (!this.game.player.alive || healed >= 60) { clearInterval(interval); return; }
      this.game.player.heal(10);
      healed += 10;
    }, 500);
  }

  _deploySlowZone(position) {
    const geo = new THREE.CylinderGeometry(4, 4, 0.2, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3 });
    const zone = new THREE.Mesh(geo, mat);
    zone.position.copy(position).setY(0.1);
    this.game.scene.add(zone);

    const effect = { mesh: zone, position: position.clone(), radius: 4, type: 'slow', life: 7 };
    this.activeEffects.push(effect);
  }

  _deployHealZone(position) {
    const geo = new THREE.CylinderGeometry(3, 3, 0.2, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.4 });
    const zone = new THREE.Mesh(geo, mat);
    zone.position.copy(position).setY(0.1);
    this.game.scene.add(zone);
    this.activeEffects.push({ mesh: zone, position: position.clone(), radius: 3, type: 'heal', life: 8 });
  }

  _shockDamage(position) {
    this.game.particles.spawnExplosion(position.clone().setY(0.5));
    this.game.audio.play('spike_explode', { volume: 0.4 });
    for (const bot of this.game.bots) {
      if (!bot.alive) continue;
      const d = bot.position.distanceTo(position);
      if (d < 4) bot.takeDamage(75 * (1 - d / 4), false, this.game.player);
    }
  }

  _reconReveal(position) {
    // Reveal bots within radius on minimap
    for (const bot of this.game.bots) {
      if (!bot.alive) continue;
      if (bot.position.distanceTo(position) < 15) {
        bot.revealed = true;
        setTimeout(() => { bot.revealed = false; }, 4000);
      }
    }
    // Visual ping
    const light = new THREE.PointLight(0x44ddff, 3, 18);
    light.position.copy(position).setY(2);
    this.game.scene.add(light);
    setTimeout(() => this.game.scene.remove(light), 600);
  }

  _huntersFury(origin, forward) {
    this.game.hud.showNotification("HUNTER'S FURY");
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.game.audio.play('shoot_sniper', { volume: 0.5 });
        const ray = new THREE.Raycaster(origin, forward, 0, 100);
        for (const bot of this.game.bots) {
          if (!bot.alive) continue;
          const hit = bot.raycast(ray);
          if (hit) bot.takeDamage(80, false, this.game.player);
        }
        // Visual beam
        const end = origin.clone().addScaledVector(forward, 80);
        const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), end]);
        const mat = new THREE.LineBasicMaterial({ color: 0xaa44ff, linewidth: 3 });
        const beam = new THREE.Line(geo, mat);
        this.game.scene.add(beam);
        setTimeout(() => this.game.scene.remove(beam), 300);
      }, i * 300);
    }
  }

  // Check if line between two points is blocked by smoke (for bot vision)
  isLineBlocked(from, to) {
    const dir = this._tmpV.copy(to).sub(from);
    const len = dir.length();
    dir.normalize();
    for (const smoke of this.smokes) {
      if (smoke.life < smoke.maxLife - 0.5 && smoke.mat.opacity < 0.3) continue;
      // Distance from smoke center to the line segment
      const toCenter = smoke.position.clone().sub(from);
      const t = Math.max(0, Math.min(len, toCenter.dot(dir)));
      const closest = from.clone().addScaledVector(dir, t);
      if (closest.distanceTo(smoke.position) < smoke.radius * 0.8) return true;
    }
    return false;
  }

  clearAll() {
    this.smokes.forEach(s => this.game.scene.remove(s.mesh));
    this.walls.forEach(w => {
      this.game.scene.remove(w.mesh);
      const idx = this.game.map.collidables.indexOf(w.mesh);
      if (idx >= 0) this.game.map.collidables.splice(idx, 1);
    });
    this.activeEffects.forEach(e => this.game.scene.remove(e.mesh));
    this.smokes = [];
    this.walls = [];
    this.activeEffects = [];
  }

  update(dt) {
    // Free-charge regeneration (signature abilities)
    const eAb = this.agent?.abilities.e;
    if (eAb && eAb.freeCharge && this.charges.e < eAb.charges && this.game.gameManager.roundActive) {
      this.cooldowns.e += dt;
      if (this.cooldowns.e >= eAb.chargeTime) {
        this.cooldowns.e = 0;
        this.charges.e++;
        this._updateHUD();
      }
    }

    // Smokes
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.life -= dt;
      if (s.growing) {
        s.mat.opacity = Math.min(0.85, s.mat.opacity + dt * 3);
        if (s.mat.opacity >= 0.85) s.growing = false;
      }
      if (s.life < 1.5) s.mat.opacity = Math.max(0, s.mat.opacity - dt * 0.6);
      if (s.life <= 0) {
        this.game.scene.remove(s.mesh);
        this.smokes.splice(i, 1);
      }
    }

    // Walls
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      w.life -= dt;
      if (w.life < 2) w.mesh.material.opacity = Math.max(0, w.mesh.material.opacity - dt * 0.3);
      if (w.life <= 0) {
        this.game.scene.remove(w.mesh);
        const idx = this.game.map.collidables.indexOf(w.mesh);
        if (idx >= 0) this.game.map.collidables.splice(idx, 1);
        this.walls.splice(i, 1);
      }
    }

    // Zones (slow/heal)
    const playerPos = this.game.player.getPosition();
    this.game.player.speedMultiplier = 1;
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const e = this.activeEffects[i];
      e.life -= dt;
      if (e.type === 'slow') {
        if (playerPos.distanceTo(e.position.clone().setY(0)) < e.radius) {
          this.game.player.speedMultiplier = 0.5;
        }
        for (const bot of this.game.bots) {
          if (bot.alive && bot.position.distanceTo(e.position.clone().setY(0)) < e.radius) {
            bot._slowed = true;
          }
        }
      } else if (e.type === 'heal') {
        if (playerPos.distanceTo(e.position.clone().setY(0)) < e.radius) {
          if (!e._lastHeal || performance.now() - e._lastHeal > 500) {
            this.game.player.heal(5);
            e._lastHeal = performance.now();
          }
        }
      }
      if (e.life <= 0) {
        this.game.scene.remove(e.mesh);
        this.activeEffects.splice(i, 1);
      }
    }
  }

  _updateHUD() {
    this.game.hud.updateAbilities(this.agent, this.charges, this.ultPoints, this.ultRequired);
  }
}
