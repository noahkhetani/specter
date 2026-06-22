import * as THREE from 'three';

export class WeaponModel {
  static create(type) {
    switch (type) {
      case 'pistol':   return WeaponModel._pistol();
      case 'smg':      return WeaponModel._smg();
      case 'shotgun':  return WeaponModel._shotgun();
      case 'rifle':    return WeaponModel._rifle();
      case 'sniper':   return WeaponModel._sniper();
      case 'lmg':      return WeaponModel._lmg();
      case 'knife':    return WeaponModel._knife();
      default:         return WeaponModel._rifle();
    }
  }

  static _mat(color, metal = 0.3, rough = 0.6) {
    return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
  }

  static _pistol() {
    const g = new THREE.Group();
    const dark = WeaponModel._mat(0x222228, 0.4, 0.5);
    const metal = WeaponModel._mat(0x444450, 0.7, 0.3);

    // Slide/barrel
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), dark);
    barrel.position.set(0, 0.02, -0.1);
    g.add(barrel);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.14), dark);
    body.position.set(0, -0.02, 0);
    g.add(body);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.05), metal);
    grip.position.set(0, -0.09, 0.04);
    grip.rotation.x = 0.1;
    g.add(grip);

    // Trigger guard
    const tg = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.06), metal);
    tg.position.set(0, -0.07, -0.01);
    g.add(tg);

    // Sight
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), metal);
    sight.position.set(0, 0.05, -0.12);
    g.add(sight);

    g.position.set(0.18, -0.22, -0.35);
    return g;
  }

  static _rifle() {
    const g = new THREE.Group();
    const dark = WeaponModel._mat(0x1a1a22, 0.4, 0.5);
    const metal = WeaponModel._mat(0x333340, 0.7, 0.3);
    const grip_mat = WeaponModel._mat(0x111116, 0.2, 0.7);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.45), metal);
    barrel.position.set(0, 0.02, -0.22);
    g.add(barrel);

    // Muzzle
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), metal);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.02, -0.47);
    g.add(muzzle);

    // Upper receiver
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.34), dark);
    upper.position.set(0, 0.015, -0.02);
    g.add(upper);

    // Lower receiver
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.24), grip_mat);
    lower.position.set(0, -0.04, -0.02);
    g.add(lower);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.045), grip_mat);
    grip.position.set(0, -0.1, 0.07);
    grip.rotation.x = 0.15;
    g.add(grip);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.18), dark);
    stock.position.set(0, -0.01, 0.19);
    g.add(stock);

    // Mag
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.04), grip_mat);
    mag.position.set(0, -0.09, -0.02);
    g.add(mag);

    // Sight rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.3), metal);
    rail.position.set(0, 0.05, -0.02);
    g.add(rail);

    // Combat optic (red-dot sight)
    const opticBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), dark);
    opticBody.position.set(0, 0.085, -0.02);
    g.add(opticBody);
    const opticLensMat = new THREE.MeshStandardMaterial({
      color: 0x113322, emissive: 0x33ff66, emissiveIntensity: 0.4,
      metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.8,
    });
    const opticLens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 12), opticLensMat);
    opticLens.rotation.x = Math.PI / 2;
    opticLens.position.set(0, 0.085, 0.018);
    g.add(opticLens);
    // Red dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.004, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 1 })
    );
    dot.position.set(0, 0.085, 0.024);
    g.add(dot);

    // Front iron sight
    const sightF = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), metal);
    sightF.position.set(0, 0.065, -0.22);
    g.add(sightF);

    g.position.set(0.18, -0.22, -0.4);
    return g;
  }

  static _smg() {
    const g = new THREE.Group();
    const dark = WeaponModel._mat(0x1e2028, 0.4, 0.5);
    const metal = WeaponModel._mat(0x38383f, 0.7, 0.3);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.3), metal);
    barrel.position.set(0, 0.01, -0.15);
    g.add(barrel);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.22), dark);
    body.position.set(0, 0.01, -0.02);
    g.add(body);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.1, 0.04), dark);
    grip.position.set(0, -0.08, 0.04);
    g.add(grip);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.035), metal);
    mag.position.set(0, -0.07, -0.02);
    g.add(mag);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.12), dark);
    stock.position.set(0, 0.01, 0.15);
    g.add(stock);

    g.position.set(0.16, -0.2, -0.38);
    return g;
  }

  static _shotgun() {
    const g = new THREE.Group();
    const dark = WeaponModel._mat(0x2a2a1e, 0.3, 0.4);
    const wood = WeaponModel._mat(0x5a3a1a, 0.1, 0.7);
    const metal = WeaponModel._mat(0x404048, 0.8, 0.2);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.24);
    g.add(barrel);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.3), dark);
    body.position.set(0, 0.01, -0.02);
    g.add(body);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.04), wood);
    grip.position.set(0, -0.1, 0.05);
    g.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.22), wood);
    stock.position.set(0, 0, 0.18);
    g.add(stock);

    g.position.set(0.18, -0.22, -0.4);
    return g;
  }

  static _sniper() {
    const g = new THREE.Group();
    const dark = WeaponModel._mat(0x15151a, 0.5, 0.4);
    const metal = WeaponModel._mat(0x2f2f36, 0.8, 0.2);

    // Long barrel
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.7), metal);
    barrel.position.set(0, 0.02, -0.34);
    g.add(barrel);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.32), dark);
    body.position.set(0, 0.01, 0.03);
    g.add(body);

    // Scope
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 10), metal);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.06, -0.02);
    g.add(scope);
    const scopeL = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 10), metal);
    scopeL.rotation.x = Math.PI / 2;
    scopeL.position.set(0, 0.06, 0.095);
    g.add(scopeL);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.04), dark);
    grip.position.set(0, -0.09, 0.09);
    g.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.2), dark);
    stock.position.set(0, -0.01, 0.24);
    g.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), metal);
    mag.position.set(0, -0.07, 0.03);
    g.add(mag);

    g.position.set(0.18, -0.24, -0.42);
    return g;
  }

  static _lmg() {
    const g = new THREE.Group();
    const dark = WeaponModel._mat(0x1c1c20, 0.4, 0.5);
    const metal = WeaponModel._mat(0x3a3a40, 0.7, 0.3);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.55), metal);
    barrel.position.set(0, 0.02, -0.26);
    g.add(barrel);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.36), dark);
    body.position.set(0, 0.01, 0.02);
    g.add(body);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), dark);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -0.06, 0.02);
    g.add(drum);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.05), dark);
    grip.position.set(0, -0.1, 0.1);
    g.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.2), dark);
    stock.position.set(0, 0.01, 0.24);
    g.add(stock);

    const bipod1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.01), metal);
    bipod1.position.set(0.04, -0.04, -0.25);
    g.add(bipod1);
    const bipod2 = bipod1.clone();
    bipod2.position.x = -0.04;
    g.add(bipod2);

    g.position.set(0.2, -0.24, -0.44);
    return g;
  }

  static _knife() {
    const g = new THREE.Group();
    const blade = WeaponModel._mat(0x888898, 0.8, 0.1);
    const handle = WeaponModel._mat(0x1a1a1a, 0.2, 0.8);

    const bladeM = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.25), blade);
    bladeM.position.set(0, 0, -0.12);
    g.add(bladeM);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), blade);
    guard.position.set(0, 0, 0.01);
    g.add(guard);

    const h = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.14), handle);
    h.position.set(0, 0, 0.09);
    g.add(h);

    g.position.set(0.16, -0.2, -0.3);
    return g;
  }
}
