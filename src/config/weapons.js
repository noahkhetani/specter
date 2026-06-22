// All weapon definitions — stats based on Valorant
export const WEAPONS = {
  // ——— MELEE ———
  knife: {
    id: 'knife', name: 'Knife', category: 'melee', price: 0, icon: '🔪',
    damage: { head: 75, body: 50, leg: 40 },
    fireRate: 1.5, altFireRate: 0.75, magSize: 1, reserve: 0, reloadTime: 0,
    spread: 0, spread_move: 0, ads: false, penetration: 'none',
    audioType: 'shoot_pistol', model: 'knife',
    spray: [[0, 0]],
  },

  // ——— PISTOLS ———
  classic: {
    id: 'classic', name: 'Classic', category: 'pistol', price: 0, icon: '🔫',
    damage: { head: 78, body: 26, leg: 22 },
    fireRate: 6.75, magSize: 12, reserve: 36, reloadTime: 1.75,
    spread: 0.4, spread_move: 1.2, ads: true, penetration: 'low',
    audioType: 'shoot_pistol', model: 'pistol',
    spray: Array.from({ length: 12 }, (_, i) => [Math.sin(i * 1.2) * 0.3, i * 0.18]),
  },

  shorty: {
    id: 'shorty', name: 'Shorty', category: 'pistol', price: 150, icon: '🔫',
    damage: { head: 12, body: 9.6, leg: 8.16 }, pellets: 15,
    fireRate: 3.3, magSize: 2, reserve: 6, reloadTime: 1.75,
    spread: 6.0, spread_move: 9.0, ads: false, penetration: 'none',
    audioType: 'shoot_shotgun', model: 'pistol',
    spray: [[0, 0], [0.1, 0.5]],
  },

  frenzy: {
    id: 'frenzy', name: 'Frenzy', category: 'pistol', price: 450, icon: '🔫',
    damage: { head: 78, body: 26, leg: 22 },
    fireRate: 10, magSize: 13, reserve: 39, reloadTime: 1.5,
    spread: 0.9, spread_move: 2.0, ads: true, penetration: 'low',
    audioType: 'shoot_pistol', model: 'pistol',
    spray: Array.from({ length: 13 }, (_, i) => [Math.sin(i * 1.5) * 0.5, i * 0.22]),
  },

  ghost: {
    id: 'ghost', name: 'Ghost', category: 'pistol', price: 500, icon: '🔫',
    damage: { head: 105, body: 30, leg: 25.5 },
    fireRate: 6.75, magSize: 15, reserve: 45, reloadTime: 1.5,
    spread: 0.3, spread_move: 0.9, ads: true, penetration: 'medium',
    audioType: 'shoot_pistol', model: 'pistol',
    spray: Array.from({ length: 15 }, (_, i) => [Math.sin(i * 1.0) * 0.2, i * 0.14]),
  },

  sheriff: {
    id: 'sheriff', name: 'Sheriff', category: 'pistol', price: 800, icon: '🔫',
    damage: { head: 160, body: 55, leg: 46.75 },
    fireRate: 4.0, magSize: 6, reserve: 24, reloadTime: 2.25,
    spread: 0.25, spread_move: 1.0, ads: true, penetration: 'high',
    audioType: 'shoot_sniper', model: 'pistol',
    spray: Array.from({ length: 6 }, (_, i) => [Math.sin(i * 0.8) * 0.2, i * 0.1]),
  },

  // ——— SMGs ———
  stinger: {
    id: 'stinger', name: 'Stinger', category: 'smg', price: 950, icon: '⚡',
    damage: { head: 67, body: 27, leg: 22.95 },
    fireRate: 16, magSize: 20, reserve: 60, reloadTime: 2.25,
    spread: 0.6, spread_move: 1.8, ads: true, penetration: 'low',
    audioType: 'shoot_smg', model: 'smg',
    spray: Array.from({ length: 20 }, (_, i) => [Math.sin(i * 1.8) * 0.8, i * 0.3 + (i > 10 ? (i - 10) * 0.5 : 0)]),
  },

  spectre: {
    id: 'spectre', name: 'Spectre', category: 'smg', price: 1600, icon: '⚡',
    damage: { head: 78, body: 26, leg: 22.1 },
    fireRate: 13.33, magSize: 30, reserve: 90, reloadTime: 2.25,
    spread: 0.5, spread_move: 1.4, ads: true, penetration: 'medium',
    audioType: 'shoot_smg', model: 'smg',
    spray: Array.from({ length: 30 }, (_, i) => [Math.sin(i * 1.3) * 0.6, i * 0.22]),
  },

  // ——— SHOTGUNS ———
  bucky: {
    id: 'bucky', name: 'Bucky', category: 'shotgun', price: 850, icon: '💥',
    damage: { head: 34, body: 34, leg: 28.9 }, pellets: 15,
    fireRate: 1.1, magSize: 5, reserve: 15, reloadTime: 2.5,
    spread: 4.0, spread_move: 7.0, ads: false, penetration: 'none',
    audioType: 'shoot_shotgun', model: 'shotgun',
    spray: [[0, 0], [0.2, 0.3], [0.3, 0.5]],
  },

  judge: {
    id: 'judge', name: 'Judge', category: 'shotgun', price: 1850, icon: '💥',
    damage: { head: 34, body: 34, leg: 28.9 }, pellets: 12,
    fireRate: 3.5, magSize: 7, reserve: 21, reloadTime: 2.2,
    spread: 3.5, spread_move: 6.0, ads: false, penetration: 'none',
    audioType: 'shoot_shotgun', model: 'shotgun',
    spray: [[0, 0], [0.3, 0.4], [0.4, 0.7], [0.2, 0.9]],
  },

  // ——— RIFLES ———
  bulldog: {
    id: 'bulldog', name: 'Bulldog', category: 'rifle', price: 2050, icon: '🔥',
    damage: { head: 116, body: 35, leg: 29.75 },
    fireRate: 9.15, magSize: 24, reserve: 72, reloadTime: 2.5,
    spread: 0.35, spread_move: 1.1, ads: true, penetration: 'medium',
    audioType: 'shoot_rifle', model: 'rifle',
    spray: Array.from({ length: 24 }, (_, i) => [Math.sin(i * 1.2) * 0.5, i * 0.2]),
  },

  guardian: {
    id: 'guardian', name: 'Guardian', category: 'rifle', price: 2250, icon: '🔥',
    damage: { head: 195, body: 65, leg: 55.25 },
    fireRate: 5.25, magSize: 12, reserve: 36, reloadTime: 2.5,
    spread: 0.15, spread_move: 0.5, ads: true, penetration: 'high',
    audioType: 'shoot_sniper', model: 'rifle',
    spray: Array.from({ length: 12 }, (_, i) => [Math.sin(i * 0.9) * 0.25, i * 0.12]),
  },

  phantom: {
    id: 'phantom', name: 'Phantom', category: 'rifle', price: 2900, icon: '🔥',
    damage: { head: 156, body: 39, leg: 33.15 },
    fireRate: 11, magSize: 30, reserve: 90, reloadTime: 2.5,
    spread: 0.22, spread_move: 0.8, ads: true, penetration: 'medium',
    audioType: 'shoot_rifle', model: 'rifle',
    spray: [
      [0,0],[0,0.8],[0.2,1.4],[-0.2,1.8],[0.4,1.4],[0.2,1.6],[-0.4,1.8],
      [-0.6,1.4],[-0.3,1.6],[0.2,1.8],[0.4,1.4],[0.2,1.2],[0,1.4],
      [-0.2,1.6],[-0.4,1.2],[0.3,1.4],[0.6,1.6],[0.3,1.2],[0,1.0],
      [-0.3,1.2],[-0.5,1.0],[-0.2,0.8],[0.1,1.0],[0.3,0.8],[0.1,0.6],
      [-0.1,0.8],[-0.3,0.6],[0.1,0.8],[0.2,0.6],[0,0.4],
    ],
  },

  vandal: {
    id: 'vandal', name: 'Vandal', category: 'rifle', price: 2900, icon: '🔥',
    damage: { head: 160, body: 40, leg: 34 },
    fireRate: 9.75, magSize: 25, reserve: 75, reloadTime: 2.5,
    spread: 0.28, spread_move: 0.9, ads: true, penetration: 'medium',
    audioType: 'shoot_rifle', model: 'rifle',
    spray: [
      [0,0],[0,1.2],[-0.3,2.1],[0.3,2.8],[0.6,2.2],[0.3,2.5],[-0.6,2.8],
      [-0.9,2.2],[-0.6,2.4],[0.3,2.6],[0.6,2.2],[0.3,2.0],[0,1.8],
      [-0.3,2.1],[-0.6,1.9],[-0.3,1.7],[0.3,1.9],[0.6,1.7],[0.3,1.5],
      [0,1.7],[-0.3,1.5],[-0.5,1.3],[0.1,1.5],[0.4,1.3],[0.1,1.1],
    ],
  },

  // ——— SNIPERS ———
  marshal: {
    id: 'marshal', name: 'Marshal', category: 'sniper', price: 950, icon: '🎯',
    damage: { head: 202, body: 101, leg: 85.85 },
    fireRate: 1.5, magSize: 5, reserve: 15, reloadTime: 2.5,
    spread: 0.0, spread_move: 2.0, ads: true, penetration: 'high',
    audioType: 'shoot_sniper', model: 'sniper',
    spray: [[0,0],[0.2,0.3],[0.1,0.5]],
    scopedOnly: true,
  },

  operator: {
    id: 'operator', name: 'Operator', category: 'sniper', price: 4700, icon: '🎯',
    damage: { head: 255, body: 150, leg: 127.5 },
    fireRate: 0.75, magSize: 5, reserve: 15, reloadTime: 3.7,
    spread: 0.0, spread_move: 4.0, ads: true, penetration: 'high',
    audioType: 'shoot_sniper', model: 'sniper',
    spray: [[0,0],[0.3,0.5]],
    scopedOnly: true,
    oneShot: true,
  },

  // ——— MACHINE GUNS ———
  ares: {
    id: 'ares', name: 'Ares', category: 'machine', price: 1600, icon: '🔩',
    damage: { head: 72, body: 30, leg: 25.5 },
    fireRate: 13, magSize: 50, reserve: 100, reloadTime: 3.5,
    spread: 0.55, spread_move: 1.6, ads: true, penetration: 'medium',
    audioType: 'shoot_rifle', model: 'lmg',
    spray: Array.from({ length: 50 }, (_, i) => [Math.sin(i * 1.1) * 0.7 + (i > 14 ? Math.cos(i * 0.8) * 0.5 : 0), i * 0.18]),
  },

  odin: {
    id: 'odin', name: 'Odin', category: 'machine', price: 3200, icon: '🔩',
    damage: { head: 105, body: 38, leg: 32.3 },
    fireRate: 15.6, magSize: 100, reserve: 200, reloadTime: 5.0,
    spread: 0.5, spread_move: 1.4, ads: true, penetration: 'high',
    audioType: 'shoot_rifle', model: 'lmg',
    spray: Array.from({ length: 100 }, (_, i) => [Math.sin(i * 1.0) * 0.6, i * 0.14]),
  },
};

export const WEAPON_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'pistol', label: 'Pistols' },
  { id: 'smg', label: 'SMGs' },
  { id: 'shotgun', label: 'Shotguns' },
  { id: 'rifle', label: 'Rifles' },
  { id: 'sniper', label: 'Snipers' },
  { id: 'machine', label: 'Machine Guns' },
];

export const ARMOR = {
  light:  { id: 'light',  name: 'Light Shield',  price: 400,  hp: 25, icon: '🛡' },
  heavy:  { id: 'heavy',  name: 'Heavy Shield',  price: 1000, hp: 50, icon: '🛡' },
};
