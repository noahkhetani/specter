import * as THREE from 'three';

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;
const EYE_HEIGHT = 1.6;
const CROUCH_HEIGHT = 1.0;
const CROUCH_EYE = 1.0;
const GRAVITY = -22;
const JUMP_VELOCITY = 7.2;

// Valorant-like movement speeds (units/sec)
const WALK_SPEED = 4.6;        // shift-walk
const RUN_SPEED = 6.75;        // default run
const CROUCH_SPEED = 2.8;

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;

    this.position = new THREE.Vector3(0, EYE_HEIGHT, 38);
    this.velocity = new THREE.Vector3();
    this.yaw = Math.PI;     // facing -Z
    this.pitch = 0;

    this.onGround = true;
    this.isCrouching = false;
    this.isWalking = false;

    this.eyeHeight = EYE_HEIGHT;
    this.targetEyeHeight = EYE_HEIGHT;

    // Combat state
    this.maxHealth = 100;
    this.health = 100;
    this.armor = 0;
    this.maxArmor = 0;
    this.alive = true;

    // Sensitivity
    this.sensitivity = 0.0022;

    // View bob / recoil offsets
    this.bobTime = 0;
    this.viewKick = new THREE.Vector2(0, 0);     // recoil applied to view
    this.recoilRecovery = new THREE.Vector2(0, 0);

    // Footstep
    this._stepDist = 0;

    // Flash blindness
    this.flashAmount = 0;

    // Speed modifiers (slows etc.)
    this.speedMultiplier = 1;

    this._tmpDir = new THREE.Vector3();
    this._tmpRay = new THREE.Raycaster();
    this._down = new THREE.Vector3(0, -1, 0);
  }

  reset(spawnPos) {
    this.position.copy(spawnPos);
    this.position.y = EYE_HEIGHT;
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.alive = true;
    this.flashAmount = 0;
    this.isCrouching = false;
  }

  getPosition() {
    return new THREE.Vector3(this.position.x, 0, this.position.z);
  }

  getFeetPosition() {
    return new THREE.Vector3(this.position.x, this.position.y - this.eyeHeight, this.position.z);
  }

  getForward() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
  }

  takeDamage(amount, fromPosition, isHeadshot) {
    if (!this.alive) return;

    // Armor absorbs damage
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health -= amount;
    this.game.hud.flashDamage(fromPosition);
    this.game.hud.updateHealth(this.health, this.armor, this.maxArmor);

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.game.onPlayerDeath();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.game.hud.updateHealth(this.health, this.armor, this.maxArmor);
  }

  setArmor(amount) {
    this.armor = amount;
    this.maxArmor = amount;
    this.game.hud.updateHealth(this.health, this.armor, this.maxArmor);
  }

  applyRecoil(x, y) {
    this.viewKick.x += y;   // vertical kick (pitch up)
    this.viewKick.y += x;   // horizontal
  }

  applyFlash(amount) {
    this.flashAmount = Math.min(1.5, this.flashAmount + amount);
  }

  update(dt, input) {
    if (!this.alive) {
      this._updateCamera();
      return;
    }

    // ── Mouse look ──
    if (input.isPointerLocked) {
      const sensMult = this.game.weaponSystem.isScoped ? this.game.weaponSystem.scopeSensFactor : 1;
      this.yaw -= input.mouse.dx * this.sensitivity * sensMult;
      this.pitch -= input.mouse.dy * this.sensitivity * sensMult;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    }

    // ── Recoil recovery ──
    const recoverRate = 8;
    this.viewKick.x = THREE.MathUtils.lerp(this.viewKick.x, 0, Math.min(1, recoverRate * dt));
    this.viewKick.y = THREE.MathUtils.lerp(this.viewKick.y, 0, Math.min(1, recoverRate * dt));

    // ── Crouch ──
    this.isCrouching = input.isKey('ControlLeft') || input.isKey('KeyC') === false && input.isKey('ControlLeft');
    this.isCrouching = input.isKey('ControlLeft');
    this.targetEyeHeight = this.isCrouching ? CROUCH_EYE : EYE_HEIGHT;
    this.eyeHeight = THREE.MathUtils.lerp(this.eyeHeight, this.targetEyeHeight, Math.min(1, 12 * dt));

    // ── Walk (shift) ──
    this.isWalking = input.isKey('ShiftLeft');

    // ── Movement input ──
    let moveX = 0, moveZ = 0;
    if (input.isKey('KeyW')) moveZ += 1;
    if (input.isKey('KeyS')) moveZ -= 1;
    if (input.isKey('KeyA')) moveX -= 1;
    if (input.isKey('KeyD')) moveX += 1;

    // Determine speed
    let speed = RUN_SPEED;
    if (this.isCrouching) speed = CROUCH_SPEED;
    else if (this.isWalking) speed = WALK_SPEED;
    speed *= this.speedMultiplier;

    // Movement vector relative to yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this._tmpDir.set(0, 0, 0);
    this._tmpDir.addScaledVector(forward, moveZ);
    this._tmpDir.addScaledVector(right, moveX);
    if (this._tmpDir.lengthSq() > 0) this._tmpDir.normalize();

    const targetVelX = this._tmpDir.x * speed;
    const targetVelZ = this._tmpDir.z * speed;

    // Acceleration (snappy on ground, floaty in air)
    const accel = this.onGround ? 14 : 3;
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelX, Math.min(1, accel * dt));
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelZ, Math.min(1, accel * dt));

    // ── Jump ──
    if (input.wasKeyPressed('Space') && this.onGround && !this.isCrouching) {
      this.velocity.y = JUMP_VELOCITY;
      this.onGround = false;
      this.game.audio.play('jump');
    }

    // ── Gravity ──
    this.velocity.y += GRAVITY * dt;

    // ── Apply movement with collision ──
    this._moveWithCollision(dt);

    // ── Footsteps ──
    if (this.onGround && (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5)) {
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      this._stepDist += horizSpeed * dt;
      const stepInterval = this.isWalking ? 2.2 : 1.6;
      if (this._stepDist > stepInterval) {
        this._stepDist = 0;
        if (!this.isWalking && !this.isCrouching) {
          this.game.audio.play('footstep', { volume: 0.5 });
        }
      }
      // View bob
      this.bobTime += horizSpeed * dt * 1.5;
    }

    // ── Flash decay ──
    if (this.flashAmount > 0) {
      this.flashAmount = Math.max(0, this.flashAmount - dt * 0.6);
    }

    this._updateCamera();
  }

  _moveWithCollision(dt) {
    const col = this.game.map.collidables;
    const newPos = this.position.clone();

    // Horizontal movement — separate axis resolution
    const moveStep = new THREE.Vector3(this.velocity.x * dt, 0, this.velocity.z * dt);

    // X axis
    newPos.x += moveStep.x;
    if (this._collidesAt(newPos, col)) newPos.x = this.position.x;

    // Z axis
    newPos.z += moveStep.z;
    if (this._collidesAt(newPos, col)) newPos.z = this.position.z;

    // Y axis (gravity / jump)
    newPos.y += this.velocity.y * dt;

    // Ground check via raycast down
    const feetY = newPos.y - this.eyeHeight;
    const groundY = this._getGroundHeight(newPos.x, newPos.z);

    if (feetY <= groundY + 0.05) {
      newPos.y = groundY + this.eyeHeight;
      this.velocity.y = 0;
      if (!this.onGround) {
        this.game.audio.play('land', { volume: 0.6 });
      }
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Ceiling check
    if (this._collidesAt(newPos, col, true)) {
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
        newPos.y = this.position.y;
      }
    }

    this.position.copy(newPos);
  }

  _collidesAt(pos, collidables, checkHead = false) {
    const feetY = pos.y - this.eyeHeight;
    const headY = feetY + (this.isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT);

    for (const mesh of collidables) {
      if (!mesh.visible && mesh.geometry.parameters.height < 1) continue;
      const box = new THREE.Box3().setFromObject(mesh);

      // Skip floor-like (very thin) for horizontal
      if (!checkHead && box.max.y - box.min.y < 0.15 && box.min.y < 0.2) continue;

      // Cylinder vs AABB (approximate with expanded box)
      const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const horizDist2 = dx * dx + dz * dz;

      if (horizDist2 < PLAYER_RADIUS * PLAYER_RADIUS) {
        // Vertical overlap?
        if (headY > box.min.y && feetY < box.max.y) {
          return true;
        }
      }
    }
    return false;
  }

  _getGroundHeight(x, z) {
    let highest = 0;  // base floor at y=0
    const px = x, pz = z;

    for (const mesh of this.game.map.collidables) {
      const box = new THREE.Box3().setFromObject(mesh);
      // Is point within horizontal bounds (with radius)?
      if (px >= box.min.x - PLAYER_RADIUS && px <= box.max.x + PLAYER_RADIUS &&
          pz >= box.min.z - PLAYER_RADIUS && pz <= box.max.z + PLAYER_RADIUS) {
        // Top of box, must be below current eye position to be standable
        const top = box.max.y;
        if (top <= this.position.y - this.eyeHeight + 0.6 && top > highest) {
          // Must actually be a horizontal surface we're over
          const closestX = Math.max(box.min.x, Math.min(px, box.max.x));
          const closestZ = Math.max(box.min.z, Math.min(pz, box.max.z));
          const dist2 = (px - closestX) ** 2 + (pz - closestZ) ** 2;
          if (dist2 < PLAYER_RADIUS * PLAYER_RADIUS) {
            highest = top;
          }
        }
      }
    }
    return highest;
  }

  _updateCamera() {
    this.camera.position.copy(this.position);

    // View bob
    let bobX = 0, bobY = 0;
    if (this.onGround) {
      const bobAmount = this.isCrouching ? 0.01 : 0.02;
      bobX = Math.cos(this.bobTime) * bobAmount;
      bobY = Math.abs(Math.sin(this.bobTime)) * bobAmount;
    }

    this.camera.position.y += bobY;
    this.camera.position.x += bobX;

    // Apply yaw/pitch + recoil kick
    const finalPitch = this.pitch + this.viewKick.x * 0.01;
    const finalYaw = this.yaw + this.viewKick.y * 0.01;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = finalYaw;
    this.camera.rotation.x = finalPitch;
    this.camera.rotation.z = 0;
  }
}
