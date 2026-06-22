import * as THREE from 'three';
import { getMapTextures } from './Textures.js';

// VERTEX — the main map, a symmetrical two-site tactical map
export class MapSystem {
  constructor(game) {
    this.game = game;
    this.collidables = [];  // solid meshes for player collision
    this.floorMeshes = [];  // floor meshes for gravity raycasting
    this.spawnPoints = { attacker: [], defender: [] };
    this.siteAreas = {
      a: { center: new THREE.Vector3(33, 0, -20), radius: 10 },
      b: { center: new THREE.Vector3(-33, 0, -20), radius: 10 },
    };
    this.ultimateOrbs = [];
    this._build();
  }

  _mat(color, rough = 0.9, metal = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  _box(scene, pos, size, mat, solid = true, floor = false) {
    const geo = new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (solid) this.collidables.push(mesh);
    if (floor) this.floorMeshes.push(mesh);
    return mesh;
  }

  _build() {
    const sc = this.game.scene;

    // ── Sky dome (vertical gradient) ──
    this._buildSky(sc);
    sc.fog = new THREE.Fog(0xcdd9e6, 75, 165);

    // ── Lights (tuned for ACES filmic tone mapping) ──
    const sun = new THREE.DirectionalLight(0xfff2e2, 3.0);
    sun.position.set(40, 85, 30);
    sun.castShadow = true;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -85;
    sun.shadow.camera.right = 85;
    sun.shadow.camera.top = 85;
    sun.shadow.camera.bottom = -85;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sc.add(sun);
    sc.add(sun.target);

    sc.add(new THREE.AmbientLight(0x9fb0c4, 0.35));
    sc.add(new THREE.HemisphereLight(0xaecbe6, 0x4a4236, 0.55));

    const T = getMapTextures();
    const tx = (set, opts = {}) => new THREE.MeshStandardMaterial({
      map: set.map, bumpMap: set.bumpMap, bumpScale: set.bumpScale ?? 0.03,
      roughness: opts.rough ?? 0.93, metalness: opts.metal ?? 0.0,
      color: opts.color ?? 0xffffff, envMapIntensity: opts.env ?? 0.6,
    });

    const FLOOR_MAT   = tx(T.floor, { rough: 0.96 });
    const WALL_MAT    = tx(T.wall,  { rough: 0.95 });
    const WALL2_MAT   = tx(T.wallAlt, { rough: 0.95 });
    const BOX_MAT     = tx(T.crate, { rough: 0.82 });
    const DARK_MAT    = tx(T.metal, { rough: 0.45, metal: 0.55, env: 1.0 });
    const SPAWN_MAT   = this._mat(0x7a9e7e);   // flat colored zone overlays
    const SITE_MAT    = this._mat(0xbe5555);
    const MID_MAT     = tx(T.wallAlt, { color: 0xd8cbb2 });

    const W = 4;  // standard wall height
    const H2 = 2; // half-height wall

    // ═══════════════════════════════════════
    //  FLOOR (divided into zones)
    // ═══════════════════════════════════════

    // Main floor
    this._box(sc, [0, -0.05, 0], [120, 0.1, 120], FLOOR_MAT, true, true);

    // A Site floor (red tint)
    this._box(sc, [33, 0.01, -20], [22, 0.02, 20], SITE_MAT, false, false);

    // B Site floor (red tint)
    this._box(sc, [-33, 0.01, -20], [22, 0.02, 20], SITE_MAT, false, false);

    // ATK Spawn floor (green tint)
    this._box(sc, [0, 0.01, 38], [36, 0.02, 14], SPAWN_MAT, false, false);

    // DEF Spawn floor
    this._box(sc, [0, 0.01, -40], [30, 0.02, 10], SPAWN_MAT, false, false);

    // ═══════════════════════════════════════
    //  OUTER BOUNDARY WALLS
    // ═══════════════════════════════════════
    this._box(sc, [0, W/2, 60],  [120, W, 1], WALL_MAT);   // south wall
    this._box(sc, [0, W/2, -60], [120, W, 1], WALL_MAT);   // north wall
    this._box(sc, [60, W/2, 0],  [1, W, 120], WALL_MAT);   // east wall
    this._box(sc, [-60, W/2, 0], [1, W, 120], WALL_MAT);   // west wall

    // Ceiling (invisible collision)
    this._box(sc, [0, W + 0.05, 0], [120, 0.1, 120], WALL_MAT, true, false);
    this.collidables[this.collidables.length - 1].visible = false;

    // ═══════════════════════════════════════
    //  ATTACKER SPAWN (center bottom)
    // ═══════════════════════════════════════
    // Spawn box walls (U-shape open to top)
    this._box(sc, [-18, W/2, 33], [1, W, 18], WALL_MAT);   // left wall
    this._box(sc, [ 18, W/2, 33], [1, W, 18], WALL_MAT);   // right wall
    this._box(sc, [0, W/2, 44],   [36, W, 1], WALL_MAT);   // back wall

    // Spawn points
    for (let i = 0; i < 5; i++) {
      this.spawnPoints.attacker.push(new THREE.Vector3(
        (i - 2) * 6, 1, 38
      ));
    }

    // ═══════════════════════════════════════
    //  DEFENDER SPAWN (center top)
    // ═══════════════════════════════════════
    this._box(sc, [-15, W/2, -35], [1, W, 12], WALL_MAT);
    this._box(sc, [ 15, W/2, -35], [1, W, 12], WALL_MAT);
    this._box(sc, [0, W/2, -41],   [30, W, 1], WALL_MAT);

    for (let i = 0; i < 5; i++) {
      this.spawnPoints.defender.push(new THREE.Vector3(
        (i - 2) * 5, 1, -38
      ));
    }

    // ═══════════════════════════════════════
    //  A SIDE (right / positive X)
    // ═══════════════════════════════════════

    // A Main corridor — east side
    // Outer wall (east boundary of A main)
    this._box(sc, [45, W/2, 18], [1, W, 40], WALL_MAT);
    // Inner wall separating A main from mid
    this._box(sc, [22, W/2, 18], [1, W, 22], WALL2_MAT);
    // A main north wall (connecting to A site)
    this._box(sc, [33, W/2, 7],  [24, W, 1], WALL_MAT);
    // A main south (connector to atk spawn)
    this._box(sc, [33, W/2, 30], [24, W, 1], WALL2_MAT);
    // Top of A main
    this._box(sc, [33.5, W/2, 5], [1, W, 5], WALL_MAT);

    // A Site walls
    this._box(sc, [22, W/2, -10],  [1, W, 22], WALL_MAT);   // A site west wall
    this._box(sc, [44, W/2, -10],  [1, W, 22], WALL_MAT);   // A site east wall
    this._box(sc, [33, W/2, -31],  [24, W, 1], WALL_MAT);   // A site north wall (back)
    this._box(sc, [22, W/2, -7.5], [1, W, 7], WALL_MAT);    // A link wall left
    this._box(sc, [33, W/2, -5],   [24, W, 1], WALL2_MAT);  // connector

    // A site cover boxes
    this._box(sc, [28, 0.5, -20], [4, 1.0, 4], BOX_MAT);   // box A1
    this._box(sc, [38, 0.45, -22], [6, 0.9, 3], BOX_MAT);  // box A2
    this._box(sc, [42, 0.9, -15], [3, 1.8, 6], BOX_MAT);   // tall box
    this._box(sc, [25, 0.3, -14], [3, 0.6, 3], BOX_MAT);   // short box
    this._box(sc, [35, 0.5, -28], [5, 1.0, 2], BOX_MAT);   // far box

    // A site elevated platform
    this._box(sc, [44, 0.75, -25], [2, 1.5, 10], DARK_MAT);

    // A catwalk divider
    this._box(sc, [33, H2/2, 15], [24, H2, 1], WALL2_MAT);

    // A defender area
    this._box(sc, [33, W/2, -37], [24, W, 1], WALL_MAT);
    this._box(sc, [22, W/2, -34], [1, W, 8], WALL_MAT);
    this._box(sc, [44, W/2, -34], [1, W, 8], WALL_MAT);

    // ═══════════════════════════════════════
    //  B SIDE (left / negative X)
    // ═══════════════════════════════════════

    // B Main corridor
    this._box(sc, [-45, W/2, 18], [1, W, 40], WALL_MAT);   // outer east
    this._box(sc, [-22, W/2, 18], [1, W, 22], WALL2_MAT);  // inner west/mid sep
    this._box(sc, [-33, W/2, 7],  [24, W, 1], WALL_MAT);
    this._box(sc, [-33, W/2, 30], [24, W, 1], WALL2_MAT);
    this._box(sc, [-33.5, W/2, 5], [1, W, 5], WALL_MAT);

    // B Site walls
    this._box(sc, [-22, W/2, -10], [1, W, 22], WALL_MAT);  // east
    this._box(sc, [-44, W/2, -10], [1, W, 22], WALL_MAT);  // west
    this._box(sc, [-33, W/2, -31], [24, W, 1], WALL_MAT);  // back
    this._box(sc, [-22, W/2, -7.5],[1, W, 7],  WALL_MAT);
    this._box(sc, [-33, W/2, -5],  [24, W, 1], WALL2_MAT);

    // B site cover boxes
    this._box(sc, [-28, 0.5, -20],  [4, 1.0, 4], BOX_MAT);
    this._box(sc, [-38, 0.45, -22], [6, 0.9, 3], BOX_MAT);
    this._box(sc, [-42, 0.9, -15],  [3, 1.8, 6], BOX_MAT);
    this._box(sc, [-25, 0.3, -14],  [3, 0.6, 3], BOX_MAT);
    this._box(sc, [-35, 0.5, -28],  [5, 1.0, 2], BOX_MAT);
    this._box(sc, [-44, 0.75, -25], [2, 1.5, 10], DARK_MAT);

    // B catwalk
    this._box(sc, [-33, H2/2, 15], [24, H2, 1], WALL2_MAT);

    // B defender area
    this._box(sc, [-33, W/2, -37], [24, W, 1], WALL_MAT);
    this._box(sc, [-22, W/2, -34], [1, W, 8], WALL_MAT);
    this._box(sc, [-44, W/2, -34], [1, W, 8], WALL_MAT);

    // ═══════════════════════════════════════
    //  MID (center)
    // ═══════════════════════════════════════

    // Mid outer walls (corridor walls)
    this._box(sc, [-22, W/2, -2], [1, W, 28], WALL_MAT);  // right side of B main wall
    this._box(sc, [ 22, W/2, -2], [1, W, 28], WALL_MAT);  // left side of A main wall

    // Mid market building
    this._box(sc, [0, W/2, -4], [10, W, 1], WALL_MAT);    // market front wall
    this._box(sc, [0, W/2, -12], [10, W, 1], WALL_MAT);   // market back wall
    this._box(sc, [-5, W/2, -8], [1, W, 8], WALL_MAT);    // market left wall
    this._box(sc, [5, W/2, -8], [1, W, 8], WALL_MAT);     // market right wall

    // Mid cover
    this._box(sc, [0, 0.5, 5], [5, 1.0, 2], BOX_MAT);    // center barrier
    this._box(sc, [-8, 0.45, 0], [3, 0.9, 3], BOX_MAT);   // left box
    this._box(sc, [8, 0.45, 0], [3, 0.9, 3], BOX_MAT);    // right box
    this._box(sc, [0, 0.3, -8], [6, 0.6, 2], BOX_MAT);   // market exterior low box

    // ═══════════════════════════════════════
    //  LINK AREAS (connecting mid to sites)
    // ═══════════════════════════════════════

    // A Link
    this._box(sc, [16, W/2, -12], [1, W, 6], WALL_MAT);
    this._box(sc, [22, W/2, -12], [1, W, 6], WALL_MAT);
    this._box(sc, [19, W/2, -15], [8, W, 1], WALL_MAT);

    // B Link
    this._box(sc, [-16, W/2, -12], [1, W, 6], WALL_MAT);
    this._box(sc, [-22, W/2, -12], [1, W, 6], WALL_MAT);
    this._box(sc, [-19, W/2, -15], [8, W, 1], WALL_MAT);

    // ═══════════════════════════════════════
    //  ULTIMATE ORBS
    // ═══════════════════════════════════════
    this._spawnOrb(new THREE.Vector3(0, 0.8, 0));         // mid orb
    this._spawnOrb(new THREE.Vector3(0, 0.8, -25));       // defender side orb

    // ═══════════════════════════════════════
    //  DECORATIVE ELEMENTS
    // ═══════════════════════════════════════
    // Lamp posts
    [[16, 0, 30], [-16, 0, 30], [0, 0, -25]].forEach(([x, y, z]) => {
      this._box(sc, [x, 1.5, z], [0.15, 3, 0.15], DARK_MAT, false);
      const lamp = new THREE.PointLight(0xffe0a0, 1.2, 8);
      lamp.position.set(x, 3.2, z);
      sc.add(lamp);
    });

    // Spike plant marker A
    const markerGeo = new THREE.PlaneGeometry(6, 6);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff4655, transparent: true, opacity: 0.15 });
    const markerA = new THREE.Mesh(markerGeo, markerMat);
    markerA.rotation.x = -Math.PI / 2;
    markerA.position.set(33, 0.02, -20);
    sc.add(markerA);

    const markerB = markerA.clone();
    markerB.position.set(-33, 0.02, -20);
    sc.add(markerB);

    // Site labels (A / B on floor)
    this._addTextLabel(sc, 'A', new THREE.Vector3(33, 0.03, -20));
    this._addTextLabel(sc, 'B', new THREE.Vector3(-33, 0.03, -20));
  }

  _buildSky(scene) {
    // Gradient sky dome — ignores fog so it stays visible on the horizon
    const geo = new THREE.SphereGeometry(420, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x3f7fc4) },
        midColor: { value: new THREE.Color(0x8fb4dc) },
        bottomColor: { value: new THREE.Color(0xd6e2ec) },
        offset: { value: 40 },
        exponent: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor;
        uniform float offset; uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);
          vec3 col = h < 0.15
            ? mix(bottomColor, midColor, smoothstep(0.0, 0.15, h))
            : mix(midColor, topColor, smoothstep(0.15, 1.0, t));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const dome = new THREE.Mesh(geo, mat);
    dome.frustumCulled = false;
    scene.add(dome);

    // Sun glow billboard in the light's direction
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = sunCanvas.height = 128;
    const sctx = sunCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,250,235,1)');
    grad.addColorStop(0.25, 'rgba(255,240,200,0.7)');
    grad.addColorStop(1, 'rgba(255,240,200,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false,
    }));
    sunSprite.scale.set(90, 90, 1);
    sunSprite.position.set(40, 85, 30).normalize().multiplyScalar(380);
    scene.add(sunSprite);
  }

  _spawnOrb(position) {
    const geo = new THREE.SphereGeometry(0.25, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9370DB, emissive: 0x6030AA, emissiveIntensity: 1,
      transparent: true, opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.game.scene.add(mesh);

    const light = new THREE.PointLight(0x9370DB, 1.5, 4);
    light.position.copy(position);
    this.game.scene.add(light);

    this.ultimateOrbs.push({ mesh, light, position: position.clone(), collected: false });
  }

  _addTextLabel(scene, text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255, 70, 85, 0.5)';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(6, 6);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    scene.add(mesh);
  }

  getSpawnPoint(team, index) {
    const points = this.spawnPoints[team];
    return points[index % points.length].clone();
  }

  isInSite(position, site) {
    const s = this.siteAreas[site];
    const dx = position.x - s.center.x;
    const dz = position.z - s.center.z;
    return (Math.abs(dx) < s.radius && Math.abs(dz) < s.radius);
  }

  getNearestSite(position) {
    const da = this.siteAreas.a.center.distanceTo(position);
    const db = this.siteAreas.b.center.distanceTo(position);
    return da < db ? 'a' : 'b';
  }

  update(dt) {
    const t = Date.now() * 0.001;
    this.ultimateOrbs.forEach(orb => {
      if (orb.collected) return;
      orb.mesh.position.y = orb.position.y + Math.sin(t * 2) * 0.15;
      orb.mesh.rotation.y += dt * 2;

      // Check if player picked it up
      const dist = this.game.player.getPosition().distanceTo(orb.position);
      if (dist < 1.2) {
        orb.collected = true;
        orb.mesh.visible = false;
        orb.light.visible = false;
        this.game.events.emit('ult_orb_collected');
        // Respawn after 2 min
        setTimeout(() => {
          orb.collected = false;
          orb.mesh.visible = true;
          orb.light.visible = true;
        }, 120000);
      }
    });
  }
}
