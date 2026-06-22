import * as THREE from 'three';
import { WEAPONS } from '../config/weapons.js';
import { WeaponModel } from './WeaponModel.js';

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;

    // Loadout: slots — 0:melee, 1:sidearm, 2:primary
    this.loadout = {
      melee: 'knife',
      sidearm: 'classic',
      primary: null,
    };
    this.currentSlot = 'sidearm';

    // Runtime ammo state per owned weapon
    this.ammoState = {};   // weaponId -> { mag, reserve }

    // Firing state
    this.lastShotTime = 0;
    this.shotsInBurst = 0;
    this.isReloading = false;
    this.reloadEnd = 0;
    this.isScoped = false;
    this.scopeSensFactor = 1;   // mouse-sens multiplier while scoped

    // Weapon viewmodel
    this.viewGroup = new THREE.Group();
    this.camera.add(this.viewGroup);
    this.currentModel = null;

    // Recoil/spray tracking
    this.sprayIndex = 0;
    this.lastFireForSpray = 0;

    // Viewmodel animation
    this.recoilOffset = 0;
    this.swayOffset = new THREE.Vector2(0, 0);

    this.raycaster = new THREE.Raycaster();

    this._initAmmo('knife');
    this._initAmmo('classic');
    this.equip('sidearm');
  }

  _initAmmo(weaponId) {
    const w = WEAPONS[weaponId];
    if (!this.ammoState[weaponId]) {
      this.ammoState[weaponId] = { mag: w.magSize, reserve: w.reserve };
    }
  }

  giveWeapon(weaponId) {
    const w = WEAPONS[weaponId];
    this._initAmmo(weaponId);
    // Refill on purchase
    this.ammoState[weaponId] = { mag: w.magSize, reserve: w.reserve };

    if (w.category === 'pistol') {
      this.loadout.sidearm = weaponId;
      this.equip('sidearm');
    } else if (w.category === 'melee') {
      this.loadout.melee = weaponId;
    } else {
      this.loadout.primary = weaponId;
      this.equip('primary');
    }
  }

  getCurrentWeaponId() {
    return this.loadout[this.currentSlot];
  }

  getCurrentWeapon() {
    return WEAPONS[this.getCurrentWeaponId()];
  }

  equip(slot) {
    if (slot === 'primary' && !this.loadout.primary) return;
    this.currentSlot = slot;
    this.isReloading = false;
    this.isScoped = false;
    this.sprayIndex = 0;
    this.game.hud.setScoped(false);

    // Rebuild viewmodel
    if (this.currentModel) this.viewGroup.remove(this.currentModel);
    const w = this.getCurrentWeapon();
    this.currentModel = WeaponModel.create(w.model);
    this.viewGroup.add(this.currentModel);

    this._updateHUD();
  }

  nextWeapon() {
    const order = ['primary', 'sidearm', 'melee'].filter(s => s === 'melee' || s === 'sidearm' || this.loadout.primary);
    let idx = order.indexOf(this.currentSlot);
    idx = (idx + 1) % order.length;
    this.equip(order[idx]);
  }

  reload() {
    const w = this.getCurrentWeapon();
    const ammo = this.ammoState[w.id];
    if (this.isReloading || ammo.mag >= w.magSize || ammo.reserve <= 0 || w.category === 'melee') return;

    this.isReloading = true;
    this.reloadEnd = performance.now() + w.reloadTime * 1000;
    this.game.audio.play('reload');
    this.game.hud.setReloading(true);
    this.isScoped = false;
    this.game.hud.setScoped(false);
  }

  _finishReload() {
    const w = this.getCurrentWeapon();
    const ammo = this.ammoState[w.id];
    const needed = w.magSize - ammo.mag;
    const take = Math.min(needed, ammo.reserve);
    ammo.mag += take;
    ammo.reserve -= take;
    this.isReloading = false;
    this.game.hud.setReloading(false);
    this._updateHUD();
  }

  _scopeStyle(w) {
    // Shotguns (and shotgun-pattern pistols) + melee get no scope; everything else does
    if (w.category === 'shotgun' || w.category === 'melee' || w.pellets) return null;
    if (w.category === 'sniper') return 'sniper';
    return 'rifle';   // rifles, SMGs, pistols, machine guns → combat optic
  }

  toggleScope() {
    const w = this.getCurrentWeapon();
    if (!w.ads) return;
    this.isScoped = !this.isScoped;
    const style = this._scopeStyle(w);
    // Sensitivity slows the more we zoom
    this.scopeSensFactor = w.category === 'sniper' ? 0.35 : 0.65;
    this.game.hud.setScoped(this.isScoped, style);
  }

  tryFire(input) {
    const w = this.getCurrentWeapon();
    const ammo = this.ammoState[w.id];
    const now = performance.now();

    if (this.isReloading) return;

    // Auto vs semi
    const isAuto = ['rifle', 'smg', 'machine'].includes(w.category) &&
                   !['guardian', 'marshal'].includes(w.id);

    const wantFire = isAuto ? input.isMouseButton(0) : input.mouse.justClicked;
    if (!wantFire) {
      // Reset spray after delay
      if (now - this.lastShotTime > 250) this.sprayIndex = 0;
      return;
    }

    const interval = 1000 / w.fireRate;
    if (now - this.lastShotTime < interval) return;

    if (ammo.mag <= 0) {
      if (input.mouse.justClicked) this.game.audio.play('empty_click');
      this.reload();
      return;
    }

    this.lastShotTime = now;
    ammo.mag--;
    this._fireShot(w);
    this._updateHUD();
  }

  _fireShot(w) {
    this.game.audio.play(w.audioType, { volume: 0.6, pitch: 0.9 + Math.random() * 0.2 });

    // Recoil / spray pattern
    const sprayPoint = w.spray[Math.min(this.sprayIndex, w.spray.length - 1)] || [0, 0];
    this.sprayIndex++;

    // Apply view recoil
    const recoilScale = this.isScoped ? 0.3 : 1;
    this.game.player.applyRecoil(
      sprayPoint[0] * recoilScale * 0.6,
      sprayPoint[1] * recoilScale * 0.5
    );

    // Viewmodel recoil
    this.recoilOffset = Math.min(0.06, this.recoilOffset + 0.04);

    // Spread (inaccuracy)
    const player = this.game.player;
    const moving = Math.hypot(player.velocity.x, player.velocity.z) > 1;
    let spread = moving ? w.spread_move : w.spread;
    if (player.isCrouching) spread *= 0.6;
    if (this.isScoped) spread *= 0.1;
    spread = (spread * Math.PI) / 180;  // to radians

    // Muzzle flash
    const muzzlePos = this._getMuzzleWorldPos();
    this.game.particles.spawnMuzzleFlash(muzzlePos);
    this._spawnMuzzleLight(muzzlePos);

    // Pellets (shotguns) or single
    const pellets = w.pellets || 1;
    let hitSomething = false;
    let killedSomeone = false;

    for (let p = 0; p < pellets; p++) {
      const result = this._raycastShot(w, spread, pellets > 1);
      if (result.hit) {
        hitSomething = true;
        if (result.killed) killedSomeone = true;
      }
    }

    if (hitSomething) {
      this.game.audio.play('hit_marker', { volume: 0.4 });
      this.game.hud.showHitMarker(killedSomeone);
    }

    // Tracer line
    this._spawnTracer(muzzlePos, w);
  }

  _raycastShot(w, spread, isPellet) {
    // Direction with spread
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    if (spread > 0) {
      const sx = (Math.random() - 0.5) * spread * 2;
      const sy = (Math.random() - 0.5) * spread * 2;
      const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      dir.addScaledVector(right, Math.sin(sx));
      dir.addScaledVector(up, Math.sin(sy));
      dir.normalize();
    }

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    this.raycaster.set(origin, dir);
    this.raycaster.far = 200;

    // Check enemies first (gather their hitbox meshes)
    const enemyHits = [];
    for (const bot of this.game.bots) {
      if (!bot.alive) continue;
      const hit = bot.raycast(this.raycaster);
      if (hit) enemyHits.push({ bot, ...hit });
    }

    // Check walls
    const wallHits = this.raycaster.intersectObjects(this.game.map.collidables, false);

    // Find nearest of enemy vs wall
    let nearestEnemy = enemyHits.sort((a, b) => a.distance - b.distance)[0];
    let nearestWall = wallHits[0];

    if (nearestEnemy && (!nearestWall || nearestEnemy.distance < nearestWall.distance)) {
      // Hit enemy
      const dmg = w.damage[nearestEnemy.zone] ?? w.damage.body;
      const killed = nearestEnemy.bot.takeDamage(dmg, nearestEnemy.zone === 'head', this.game.player);
      this.game.particles.spawnBlood(nearestEnemy.point);
      if (nearestEnemy.zone === 'head') this.game.audio.play('headshot', { volume: 0.5 });
      return { hit: true, killed, point: nearestEnemy.point };
    } else if (nearestWall) {
      // Hit wall
      this.game.particles.spawnWallImpact(nearestWall.point, nearestWall.face?.normal || new THREE.Vector3(0, 1, 0));
      this.game.particles.spawnDecal(nearestWall.point, nearestWall.face?.normal || new THREE.Vector3(0, 1, 0));
      this.game.audio.play('wall_impact', { volume: 0.3 });
      return { hit: false };
    }
    return { hit: false };
  }

  _getMuzzleWorldPos() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    return origin.addScaledVector(dir, 0.6);
  }

  _spawnMuzzleLight(pos) {
    const light = new THREE.PointLight(0xffaa33, 3, 6);
    light.position.copy(pos);
    this.game.scene.add(light);
    setTimeout(() => this.game.scene.remove(light), 50);
  }

  _spawnTracer(start, w) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const end = start.clone().addScaledVector(dir, 100);

    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(geo, mat);
    this.game.scene.add(line);

    let opacity = 0.6;
    const fade = () => {
      opacity -= 0.1;
      mat.opacity = opacity;
      if (opacity > 0) requestAnimationFrame(fade);
      else { this.game.scene.remove(line); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(fade);
  }

  refillAll() {
    for (const id in this.ammoState) {
      const w = WEAPONS[id];
      this.ammoState[id] = { mag: w.magSize, reserve: w.reserve };
    }
    this._updateHUD();
  }

  resetLoadout() {
    this.loadout.primary = null;
    this.loadout.sidearm = 'classic';
    this.loadout.melee = 'knife';
    this.equip('sidearm');
    this.refillAll();
  }

  update(dt, input) {
    // Finish reload
    if (this.isReloading && performance.now() >= this.reloadEnd) {
      this._finishReload();
    }

    // Weapon switching
    if (input.wasKeyPressed('Digit1')) this.equip('primary');
    if (input.wasKeyPressed('Digit2')) this.equip('sidearm');
    if (input.wasKeyPressed('Digit3')) this.equip('melee');
    if (input.scrollDelta !== 0) this.nextWeapon();

    // Reload
    if (input.wasKeyPressed('KeyR')) this.reload();

    // Scope (right click for snipers/ADS)
    if (input.mouse.justRightClicked) this.toggleScope();

    // Fire
    if (this.game.player.alive && this.game.canPlayerAct()) {
      this.tryFire(input);
    }

    // Viewmodel animation
    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, Math.min(1, 10 * dt));

    // Weapon sway from mouse movement
    this.swayOffset.x = THREE.MathUtils.lerp(this.swayOffset.x, -input.mouse.dx * 0.0002, 0.1);
    this.swayOffset.y = THREE.MathUtils.lerp(this.swayOffset.y, input.mouse.dy * 0.0002, 0.1);

    if (this.currentModel) {
      const baseZ = this.currentModel.userData.baseZ ?? this.currentModel.position.z;
      if (this.currentModel.userData.baseZ === undefined) {
        this.currentModel.userData.baseX = this.currentModel.position.x;
        this.currentModel.userData.baseY = this.currentModel.position.y;
        this.currentModel.userData.baseZ = this.currentModel.position.z;
      }
      // ADS position
      const scopeBlend = this.isScoped ? 1 : 0;
      const targetX = THREE.MathUtils.lerp(this.currentModel.userData.baseX, 0, scopeBlend) + this.swayOffset.x;
      const targetY = THREE.MathUtils.lerp(this.currentModel.userData.baseY, -0.15, scopeBlend) + this.swayOffset.y;

      this.currentModel.position.x = THREE.MathUtils.lerp(this.currentModel.position.x, targetX, 0.3);
      this.currentModel.position.y = THREE.MathUtils.lerp(this.currentModel.position.y, targetY, 0.3);
      this.currentModel.position.z = this.currentModel.userData.baseZ + this.recoilOffset;

      // Reload rotation animation
      if (this.isReloading) {
        const prog = 1 - (this.reloadEnd - performance.now()) / (this.getCurrentWeapon().reloadTime * 1000);
        this.currentModel.rotation.x = Math.sin(prog * Math.PI) * 0.6;
        this.currentModel.position.y -= Math.sin(prog * Math.PI) * 0.1;
      } else {
        this.currentModel.rotation.x = THREE.MathUtils.lerp(this.currentModel.rotation.x, 0, 0.2);
      }
    }

    // FOV change for scope — heavier zoom for snipers, mild combat optic for the rest
    let targetFov = 75;
    if (this.isScoped) {
      const w = this.getCurrentWeapon();
      if (w.id === 'operator') targetFov = 25;
      else if (w.category === 'sniper') targetFov = 35;   // marshal
      else targetFov = 55;                                 // combat optic on everything else
    }
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, 12 * dt));
    this.camera.updateProjectionMatrix();
  }

  _updateHUD() {
    const w = this.getCurrentWeapon();
    const ammo = this.ammoState[w.id];
    this.game.hud.updateAmmo(ammo.mag, ammo.reserve, w.name, w.category === 'melee');
    this.game.hud.updateWeaponSlots(this.loadout, this.currentSlot);
  }
}
