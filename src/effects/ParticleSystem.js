import * as THREE from 'three';

export class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.pools = [];
    this._tmpV = new THREE.Vector3();
  }

  // Spawn a burst of particles at a position
  spawn(options = {}) {
    const {
      position = new THREE.Vector3(),
      count = 12,
      color = 0xff4444,
      size = 0.06,
      speed = 3,
      life = 0.4,
      gravity = -8,
    } = options;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * speed * 2,
        (Math.random() * speed),
        (Math.random() - 0.5) * speed * 2
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true });
    const points = new THREE.Points(geo, mat);
    this.game.scene.add(points);

    this.pools.push({ points, geo, velocities, life, maxLife: life, gravity, count });
  }

  spawnBlood(position) {
    this.spawn({ position, count: 20, color: 0xcc1111, size: 0.05, speed: 4, life: 0.5 });
  }

  spawnWallImpact(position, normal) {
    this.spawn({ position, count: 8, color: 0x888888, size: 0.04, speed: 2, life: 0.3, gravity: -4 });

    // Decal spark
    this.spawn({ position, count: 5, color: 0xffaa00, size: 0.03, speed: 3, life: 0.2, gravity: -6 });
  }

  spawnExplosion(position) {
    this.spawn({ position, count: 60, color: 0xff6600, size: 0.12, speed: 10, life: 0.8, gravity: -5 });
    this.spawn({ position, count: 30, color: 0xffcc00, size: 0.08, speed: 8, life: 0.5, gravity: -3 });
    this.spawn({ position, count: 40, color: 0x444444, size: 0.15, speed: 6, life: 1.2, gravity: -8 });
  }

  spawnMuzzleFlash(position) {
    this.spawn({ position, count: 6, color: 0xffee00, size: 0.08, speed: 1, life: 0.06, gravity: 0 });
  }

  spawnSmoke(position) {
    this.spawn({ position, count: 30, color: 0x888888, size: 0.3, speed: 1, life: 3.0, gravity: 0.2 });
  }

  update(dt) {
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.game.scene.remove(p.points);
        p.geo.dispose();
        p.points.material.dispose();
        this.pools.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      p.points.material.opacity = t;

      const pos = p.geo.attributes.position;
      for (let j = 0; j < p.count; j++) {
        const v = p.velocities[j];
        v.y += p.gravity * dt;
        pos.array[j * 3] += v.x * dt;
        pos.array[j * 3 + 1] += v.y * dt;
        pos.array[j * 3 + 2] += v.z * dt;
      }
      pos.needsUpdate = true;
    }
  }

  // Simple decal (flat square on surface)
  spawnDecal(position, normal, color = 0x111111) {
    const geo = new THREE.PlaneGeometry(0.1, 0.1);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).addScaledVector(normal, 0.01);
    mesh.lookAt(position.clone().add(normal));
    this.game.scene.add(mesh);

    // Fade out after 30s
    setTimeout(() => {
      this.game.scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    }, 30000);
  }
}
