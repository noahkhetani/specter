export class Minimap {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.size = 180;

    // World bounds → minimap scale
    this.worldSize = 130;   // -65 to 65
    this.scale = this.size / this.worldSize;
  }

  _worldToMap(x, z) {
    // World X → map X (centered), World Z → map Y
    return {
      x: this.size / 2 + x * this.scale,
      y: this.size / 2 + z * this.scale,
    };
  }

  update() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.size, this.size);

    // Background
    ctx.fillStyle = 'rgba(15, 25, 35, 0.9)';
    ctx.fillRect(0, 0, this.size, this.size);

    // Draw site markers
    this._drawSite('a', 33, -20, '#ff4655');
    this._drawSite('b', -33, -20, '#ff4655');

    // Draw simplified walls
    ctx.strokeStyle = 'rgba(136, 154, 164, 0.4)';
    ctx.lineWidth = 1;
    this._drawMapOutline();

    // Spike
    if (this.game.spike) {
      const sp = this.game.spike;
      if (sp.state === 'planted' || sp.state === 'defusing') {
        const m = this._worldToMap(sp.position.x, sp.position.z);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Pulse ring
        const pulse = 4 + Math.abs(Math.sin(Date.now() * 0.006)) * 4;
        ctx.strokeStyle = 'rgba(255,0,0,0.6)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (sp.state === 'dropped') {
        const m = this._worldToMap(sp.position.x, sp.position.z);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
      }
    }

    // Draw bots
    for (const bot of this.game.bots) {
      if (!bot.alive) continue;
      const sameTeam = bot.team === this.game.player.team;
      // Only show enemies if revealed or same team
      if (!sameTeam && !bot.revealed) continue;
      const m = this._worldToMap(bot.position.x, bot.position.z);
      ctx.fillStyle = sameTeam ? '#4CAF50' : '#ff4655';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player (with view cone)
    const player = this.game.player;
    const pm = this._worldToMap(player.position.x, player.position.z);

    // View cone
    ctx.save();
    ctx.translate(pm.x, pm.y);
    ctx.rotate(-player.yaw + Math.PI);
    ctx.fillStyle = 'rgba(255, 251, 245, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 30, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Player dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pm.x, pm.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawSite(label, x, z, color) {
    const m = this._worldToMap(x, z);
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 70, 85, 0.12)';
    ctx.fillRect(m.x - 14, m.y - 14, 28, 28);
    ctx.strokeStyle = 'rgba(255, 70, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(m.x - 14, m.y - 14, 28, 28);
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), m.x, m.y);
  }

  _drawMapOutline() {
    const ctx = this.ctx;
    // Simplified — outer boundary
    const tl = this._worldToMap(-60, -60);
    const br = this._worldToMap(60, 60);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // Spawn areas
    const atk = this._worldToMap(-18, 24);
    const atkBr = this._worldToMap(18, 44);
    ctx.fillStyle = 'rgba(122, 158, 126, 0.15)';
    ctx.fillRect(atk.x, atk.y, atkBr.x - atk.x, atkBr.y - atk.y);

    const def = this._worldToMap(-15, -41);
    const defBr = this._worldToMap(15, -29);
    ctx.fillStyle = 'rgba(74, 144, 217, 0.15)';
    ctx.fillRect(def.x, def.y, defBr.x - def.x, defBr.y - def.y);
  }
}
