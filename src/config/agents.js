// Agent roster — 5 agents across all 4 roles
export const AGENTS = {
  swift: {
    id: 'swift', name: 'SWIFT', role: 'Duelist',
    color: '#FFD700', icon: '⚡', emoji: '⚡',
    description: 'An agile duelist who dashes through the battlefield, leaving behind afterimages and smoke clouds.',
    abilities: {
      c: { key: 'c', name: 'Cloudburst', desc: 'Throw a smoke grenade that expands on impact.', icon: '💨', type: 'smoke',     price: 200, charges: 2 },
      q: { key: 'q', name: 'Updraft',    desc: 'Instantly propel yourself upward.',             icon: '🌀', type: 'jump',      price: 200, charges: 1 },
      e: { key: 'e', name: 'Tailwind',   desc: 'Dash in your movement direction.',              icon: '💨', type: 'dash',      price: 0,   charges: 1, freeCharge: true, chargeTime: 20 },
      x: { key: 'x', name: 'Blade Storm', desc: 'Equip throwing knives. Kills recharge them.', icon: '🗡',  type: 'bladestorm', price: 0,   charges: 0, ultPoints: 7 },
    },
    startWeapon: 'classic',
  },

  phantom_agent: {
    id: 'phantom_agent', name: 'PHANTOM', role: 'Initiator',
    color: '#4A90D9', icon: '🦅', emoji: '🦅',
    description: 'A master of intel-gathering, using recon tools and shock bolts to flush out enemies.',
    abilities: {
      c: { key: 'c', name: 'Recon Bolt',  desc: 'Fire a bolt that reveals nearby enemies.',      icon: '🔍', type: 'recon',   price: 200, charges: 1 },
      q: { key: 'q', name: 'Shock Bolt',  desc: 'Launch an electric bolt that deals damage.',    icon: '⚡', type: 'shock',   price: 100, charges: 2 },
      e: { key: 'e', name: 'Owl Drone',   desc: 'Deploy a scout drone to reveal enemies.',       icon: '🦅', type: 'drone',   price: 0,   charges: 1, freeCharge: true, chargeTime: 35 },
      x: { key: 'x', name: "Hunter's Fury", desc: 'Fire three long-range energy blasts.',       icon: '💫', type: 'fury',    price: 0,   charges: 0, ultPoints: 8 },
    },
    startWeapon: 'classic',
  },

  veil: {
    id: 'veil', name: 'VEIL', role: 'Controller',
    color: '#8B5CF6', icon: '👻', emoji: '👻',
    description: 'A shadowy controller who bends darkness to block sightlines and bamboozle foes.',
    abilities: {
      c: { key: 'c', name: 'Shrouded Step', desc: 'Teleport a short distance forward.',           icon: '🌑', type: 'teleport', price: 100, charges: 2 },
      q: { key: 'q', name: 'Paranoia',      desc: 'Throw a blinding orb that travels forward.',  icon: '👁',  type: 'flash',   price: 300, charges: 1 },
      e: { key: 'e', name: 'Dark Cover',    desc: 'Send a smoke sphere to any location.',         icon: '💨', type: 'smoke',   price: 0,   charges: 2, freeCharge: true, chargeTime: 40 },
      x: { key: 'x', name: 'From the Shadows', desc: 'Teleport to any location on the map.',     icon: '🌌', type: 'tpshadow', price: 0, charges: 0, ultPoints: 7 },
    },
    startWeapon: 'classic',
  },

  guard: {
    id: 'guard', name: 'GUARD', role: 'Sentinel',
    color: '#00C9A7', icon: '🛡', emoji: '🛡',
    description: 'A resilient sentinel with healing abilities and defensive barriers.',
    abilities: {
      c: { key: 'c', name: 'Barrier Orb', desc: 'Create a solid wall of ice.',                  icon: '🧊', type: 'wall',   price: 400, charges: 1 },
      q: { key: 'q', name: 'Slow Orb',   desc: 'Throw an orb that creates a slowing zone.',    icon: '🔵', type: 'slow',   price: 100, charges: 2 },
      e: { key: 'e', name: 'Healing Orb', desc: 'Heal yourself or an ally over time.',          icon: '💚', type: 'heal',   price: 0,   charges: 1, freeCharge: true, chargeTime: 45 },
      x: { key: 'x', name: 'Resurrection', desc: 'Revive a dead teammate instantly.',          icon: '✨', type: 'resurrect', price: 0, charges: 0, ultPoints: 8 },
    },
    startWeapon: 'classic',
  },

  blaze: {
    id: 'blaze', name: 'BLAZE', role: 'Duelist',
    color: '#FF6B35', icon: '🔥', emoji: '🔥',
    description: 'A fiery duelist who uses flames to heal himself and burn his enemies.',
    abilities: {
      c: { key: 'c', name: 'Blaze',       desc: 'Cast a moving fire wall that blocks vision.',  icon: '🔥', type: 'firewall',  price: 200, charges: 1 },
      q: { key: 'q', name: 'Curveball',   desc: 'Throw a curving flash grenade.',               icon: '🌟', type: 'flash',   price: 100, charges: 2 },
      e: { key: 'e', name: 'Hot Hands',   desc: 'Throw a fireball that heals you on contact.',  icon: '🔥', type: 'hotzone', price: 0,   charges: 1, freeCharge: true, chargeTime: 30 },
      x: { key: 'x', name: 'Run It Back', desc: 'Mark location. Respawn there if killed during ult.', icon: '♻', type: 'runback', price: 0, charges: 0, ultPoints: 6 },
    },
    startWeapon: 'classic',
  },
};

export const AGENT_LIST = Object.values(AGENTS);
