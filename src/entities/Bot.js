import * as THREE from 'three';

const BOT_NAMES = [
  'Reaper', 'Viper', 'Ghost', 'Razor', 'Echo', 'Frost', 'Nyx', 'Talon',
  'Onyx', 'Blitz', 'Cobra', 'Wraith', 'Drift', 'Saber', 'Krait',
];

// Bot states
const STATE = {
  IDLE: 'idle',
  PATROL: 'patrol',
  CHASE: 'chase',
  COMBAT: 'combat',
  PUSH_SITE: 'push_site',
  PLANT: 'plant',
  DEFEND: 'defend',
  ROTATE: 'rotate',
};

let botIdCounter = 0;

export class Bot {
  constructor(game, team, index) {
    this.game = game;
    this.team = team;   // 'attacker' or 'defender'
    this.index = index;
    this.id = botIdCounter++;
    this.name = BOT_NAMES[this.id % BOT_NAMES.length];

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;

    this.maxHealth = 100;
    this.health = 100;
    this.armor = 50;
    this.alive = true;

    // Combat
    this.target = null;        // current target (player or bot)
    this.lastSeenTarget = null;
    this.lastShotTime = 0;
    this.fireRate = 7 + Math.random() * 3;
    this.accuracy = 0.55 + Math.random() * 0.25;   // difficulty
    this.reactionDelay = 0.15 + Math.random() * 0.25;
    this.reactionTimer = 0;
    this.damage = 30;
    this.viewDistance = 45;
    this.fov = Math.PI * 0.55;

    this.state = STATE.IDLE;
    this.stateTimer = 0;
    this.pathTarget = null;
    this.wanderTarget = null;

    this.hasSpike = false;

    this._buildMesh();

    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
  }

  _buildMesh() {
    this.group = new THREE.Group();

    const teamColor = this.team === 'attacker' ? 0xff4655 : 0x4A90D9;
    const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.6, metalness: 0.2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd0a080, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7 });

    // Torso (body hitbox)
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), bodyMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.torso.userData = { bot: this, zone: 'body' };
    this.group.add(this.torso);

    // Head (head hitbox)
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
    this.head.position.y = 1.62;
    this.head.castShadow = true;
    this.head.userData = { bot: this, zone: 'head' };
    this.group.add(this.head);

    // Helmet
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), darkMat);
    helmet.position.y = 1.72;
    this.group.add(helmet);

    // Legs (leg hitbox)
    this.legs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.28), darkMat);
    this.legs.position.y = 0.35;
    this.legs.userData = { bot: this, zone: 'leg' };
    this.group.add(this.legs);

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), bodyMat);
    armL.position.set(-0.34, 1.05, 0);
    this.group.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.34;
    this.group.add(armR);

    // Gun (simple)
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.4), darkMat);
    gun.position.set(0.3, 1.1, -0.3);
    this.group.add(gun);

    // Name tag
    this._buildNameTag(teamColor);

    this.hitboxes = [this.head, this.torso, this.legs];
    this.game.scene.add(this.group);
  }

  _buildNameTag(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    this._nameCanvas = canvas;
    this._nameCtx = ctx;
    this._redrawNameTag(color);

    const tex = new THREE.CanvasTexture(canvas);
    this._nameTex = tex;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    this.nameTag = new THREE.Sprite(mat);
    this.nameTag.scale.set(1.6, 0.4, 1);
    this.nameTag.position.y = 2.1;
    this.group.add(this.nameTag);
  }

  _redrawNameTag() {
    const ctx = this._nameCtx;
    ctx.clearRect(0, 0, 256, 64);
    // Health bar bg
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(28, 38, 200, 8);
    // Health bar
    const hpPct = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = this.team === 'attacker' ? '#ff4655' : '#4A90D9';
    ctx.fillRect(28, 38, 200 * hpPct, 8);
    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 128, 26);
    if (this._nameTex) this._nameTex.needsUpdate = true;
  }

  spawn(pos) {
    this.position.copy(pos);
    this.position.y = 0;
    this.health = this.maxHealth;
    this.armor = 50;
    this.alive = true;
    this.target = null;
    this.state = this.team === 'attacker' ? STATE.PUSH_SITE : STATE.DEFEND;
    this.group.visible = true;
    this._pickNewObjective();
    this._redrawNameTag();
  }

  raycast(raycaster) {
    if (!this.alive) return null;
    const hits = raycaster.intersectObjects(this.hitboxes, false);
    if (hits.length === 0) return null;
    const hit = hits[0];
    return {
      zone: hit.object.userData.zone,
      distance: hit.distance,
      point: hit.point,
    };
  }

  takeDamage(amount, isHeadshot, attacker) {
    if (!this.alive) return false;

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health -= amount;
    this._redrawNameTag();

    // Aggravate — turn toward attacker
    if (attacker && attacker.getPosition) {
      this.target = attacker;
      this.lastSeenTarget = attacker.getPosition();
      this.state = STATE.COMBAT;
    }

    if (this.health <= 0) {
      this.die(attacker, isHeadshot);
      return true;
    }
    return false;
  }

  die(killer, isHeadshot) {
    this.alive = false;
    this.group.visible = false;
    this.game.onBotKilled(this, killer, isHeadshot);

    // Drop spike if carrier
    if (this.hasSpike) {
      this.hasSpike = false;
      this.game.spike.drop(this.position.clone());
    }
  }

  getPosition() {
    return new THREE.Vector3(this.position.x, 0, this.position.z);
  }

  _pickNewObjective() {
    if (this.team === 'attacker') {
      // Push toward a site
      const site = this.game.gameManager.targetSite || (Math.random() < 0.5 ? 'a' : 'b');
      const siteCenter = this.game.map.siteAreas[site].center;
      this.pathTarget = siteCenter.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12
      ));
    } else {
      // Defenders hold sites or roam
      const site = Math.random() < 0.5 ? 'a' : 'b';
      const siteCenter = this.game.map.siteAreas[site].center;
      this.pathTarget = siteCenter.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 14
      ));
    }
  }

  _canSeeTarget(targetPos) {
    const eyePos = this._tmpV.copy(this.position).setY(1.5);
    const dir = this._tmpV2.copy(targetPos).setY(1.5).sub(eyePos);
    const dist = dir.length();
    if (dist > this.viewDistance) return false;
    dir.normalize();

    // FOV check
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const angle = forward.angleTo(new THREE.Vector3(dir.x, 0, dir.z));
    if (angle > this.fov) return false;

    // Line of sight raycast against walls
    this.raycaster.set(eyePos, dir);
    this.raycaster.far = dist - 0.5;
    const wallHits = this.raycaster.intersectObjects(this.game.map.collidables, false);

    // Check smoke blocking
    if (this.game.abilitySystem.isLineBlocked(eyePos, targetPos)) return false;

    return wallHits.length === 0;
  }

  _findTarget() {
    const candidates = [];

    // Player is a target if bot is defender, or attacker (player can be either)
    if (this.game.player.alive && this.game.player.team !== this.team) {
      candidates.push(this.game.player);
    }

    // Other bots on opposing team
    for (const bot of this.game.bots) {
      if (bot !== this && bot.alive && bot.team !== this.team) {
        candidates.push(bot);
      }
    }

    let best = null, bestDist = Infinity;
    for (const c of candidates) {
      const cPos = c.getPosition();
      if (this._canSeeTarget(cPos)) {
        const d = this.position.distanceTo(cPos);
        if (d < bestDist) { bestDist = d; best = c; }
      }
    }
    return best;
  }

  _moveToward(targetPos, dt, speed) {
    const dir = this._tmpV.copy(targetPos).sub(this.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.5) return true;
    dir.normalize();

    // Desired yaw
    const targetYaw = Math.atan2(-dir.x, -dir.z);
    this.yaw = this._lerpAngle(this.yaw, targetYaw, Math.min(1, 8 * dt));

    // Simple obstacle avoidance — check ahead
    const ahead = this._tmpV2.copy(this.position).addScaledVector(dir, 1.0);
    if (this._collides(ahead)) {
      // Try strafing
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      const altA = this.position.clone().addScaledVector(perp, 1.0);
      const altB = this.position.clone().addScaledVector(perp, -1.0);
      if (!this._collides(altA)) dir.copy(perp);
      else if (!this._collides(altB)) dir.copy(perp).negate();
      else return false;
    }

    const move = dir.multiplyScalar(speed * dt);
    const newPos = this.position.clone().add(move);
    if (!this._collides(newPos)) {
      this.position.copy(newPos);
    } else {
      // Axis separated
      const nx = this.position.clone(); nx.x += move.x;
      if (!this._collides(nx)) this.position.x = nx.x;
      const nz = this.position.clone(); nz.z += move.z;
      if (!this._collides(nz)) this.position.z = nz.z;
    }

    return false;
  }

  _collides(pos) {
    const r = 0.4;
    const botTop = 1.8;            // bot stands ~1.8 units tall
    for (const mesh of this.game.map.collidables) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.min.y > botTop) continue;   // obstacle is above the bot (ceiling / high beams)
      if (box.max.y < 0.6) continue;      // low cover the bot walks past / floor slab
      const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z));
      const dx = pos.x - cx, dz = pos.z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  _shootAt(targetPos, dt) {
    const now = performance.now();
    const interval = 1000 / this.fireRate;
    if (now - this.lastShotTime < interval) return;
    this.lastShotTime = now;

    // Accuracy roll
    const dist = this.position.distanceTo(targetPos);
    const distPenalty = Math.min(0.4, dist / 100);
    const hitChance = this.accuracy - distPenalty;

    // Muzzle flash
    const muzzle = this.position.clone().setY(1.2);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    muzzle.addScaledVector(forward, 0.4);
    this.game.particles.spawnMuzzleFlash(muzzle);
    this.game.audio.play('shoot_rifle', { volume: 0.25, pitch: 0.85 });

    // Tracer
    this._spawnTracer(muzzle, targetPos);

    if (Math.random() < hitChance) {
      // Hit — apply damage to target
      const isHead = Math.random() < 0.2;
      const dmg = isHead ? this.damage * 2.5 : this.damage * (0.85 + Math.random() * 0.3);

      if (this.target === this.game.player) {
        this.game.player.takeDamage(dmg, this.position.clone(), isHead);
      } else if (this.target && this.target.takeDamage) {
        this.target.takeDamage(dmg, isHead, this);
      }
    }
  }

  _spawnTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end.clone().setY(1.2)]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geo, mat);
    this.game.scene.add(line);
    let op = 0.5;
    const fade = () => {
      op -= 0.12;
      mat.opacity = op;
      if (op > 0) requestAnimationFrame(fade);
      else { this.game.scene.remove(line); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(fade);
  }

  update(dt) {
    if (!this.alive) return;

    this.stateTimer -= dt;

    if (!this.game.gameManager.roundActive) {
      // Buy phase: gentle idle wander near spawn so the world feels alive — hold fire
      if (!this._buyWander || this.stateTimer <= 0) {
        this.stateTimer = 2 + Math.random() * 3;
        this._buyWander = this.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8
        ));
      }
      this._moveToward(this._buyWander, dt, 2.5);
      this.position.y = 0;
      this._updateMesh();
      return;
    }
    this._buyWander = null;

    // Acquire target
    const visibleTarget = this._findTarget();
    if (visibleTarget) {
      this.target = visibleTarget;
      this.lastSeenTarget = visibleTarget.getPosition();
      if (this.state !== STATE.COMBAT) {
        this.state = STATE.COMBAT;
        this.reactionTimer = this.reactionDelay;
      }
    } else if (this.state === STATE.COMBAT && !visibleTarget) {
      // Lost target — investigate last seen
      if (this.stateTimer <= 0) {
        this.target = null;
        this.state = this.team === 'attacker' ? STATE.PUSH_SITE : STATE.DEFEND;
        this._pickNewObjective();
      }
    }

    // State machine
    switch (this.state) {
      case STATE.COMBAT:
        this._updateCombat(dt);
        break;
      case STATE.PUSH_SITE:
      case STATE.DEFEND:
        this._updateObjective(dt);
        break;
      default:
        this._updateObjective(dt);
    }

    // Gravity / ground
    this.position.y = 0;

    this._updateMesh();
  }

  _updateCombat(dt) {
    if (!this.target || !this.target.alive) {
      this.target = null;
      this.state = this.team === 'attacker' ? STATE.PUSH_SITE : STATE.DEFEND;
      return;
    }

    const targetPos = this.target.getPosition();
    const dist = this.position.distanceTo(targetPos);

    // Face target
    const dir = this._tmpV.copy(targetPos).sub(this.position);
    const targetYaw = Math.atan2(-dir.x, -dir.z);
    this.yaw = this._lerpAngle(this.yaw, targetYaw, Math.min(1, 12 * dt));

    // Reaction delay before shooting
    if (this.reactionTimer > 0) {
      this.reactionTimer -= dt;
      return;
    }

    // Maintain combat distance — strafe
    const canSee = this._canSeeTarget(targetPos);
    if (canSee) {
      this.lastSeenTarget = targetPos.clone();
      // Strafe sideways occasionally
      if (Math.random() < 0.02) this._strafeDir = (Math.random() < 0.5 ? 1 : -1);
      if (this._strafeDir) {
        const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        const strafePos = this.position.clone().addScaledVector(perp, this._strafeDir * 3 * dt);
        if (!this._collides(strafePos)) this.position.copy(strafePos);
      }

      // Close distance if far
      if (dist > 25) {
        this._moveToward(targetPos, dt, 4);
      }

      this._shootAt(targetPos, dt);
    } else {
      // Move to last seen position
      if (this.lastSeenTarget) {
        const reached = this._moveToward(this.lastSeenTarget, dt, 5);
        if (reached) {
          this.target = null;
          this.state = this.team === 'attacker' ? STATE.PUSH_SITE : STATE.DEFEND;
          this._pickNewObjective();
        }
      }
    }
  }

  _updateObjective(dt) {
    if (!this.pathTarget) this._pickNewObjective();

    const speed = 5.5;
    const reached = this._moveToward(this.pathTarget, dt, speed);

    if (reached || this.stateTimer <= 0) {
      this.stateTimer = 3 + Math.random() * 4;

      // Attacker with spike near site — plant
      if (this.team === 'attacker' && this.hasSpike) {
        const site = this.game.map.getNearestSite(this.position);
        if (this.game.map.isInSite(this.position, site)) {
          this.game.spike.botStartPlant(this);
          return;
        }
      }

      this._pickNewObjective();
    }
  }

  _updateMesh() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    // Name tag faces camera
    if (this.nameTag) {
      this.nameTag.rotation.y = -this.yaw + (this.game.camera.rotation.y);
    }
  }

  _lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
}
