export class Scoreboard {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.el = {
      board: document.getElementById('scoreboard'),
      score: document.getElementById('sb-score'),
      body: document.getElementById('sb-body'),
    };
  }

  open() {
    this.isOpen = true;
    this.el.board.classList.add('open');
    this._render();
  }

  close() {
    this.isOpen = false;
    this.el.board.classList.remove('open');
  }

  _render() {
    const gm = this.game.gameManager;
    this.el.score.innerHTML =
      `<span style="color:var(--red)">${gm.scores.attacker}</span>` +
      `<span style="color:var(--muted)"> : </span>` +
      `<span style="color:#4A90D9">${gm.scores.defender}</span>`;

    const playerTeam = this.game.player.team;

    // Build rosters
    const attackers = this._roster('attacker');
    const defenders = this._roster('defender');

    this.el.body.innerHTML =
      this._teamBlock('ATTACKERS', 'attack', attackers, playerTeam === 'attacker') +
      this._teamBlock('DEFENDERS', 'defend', defenders, playerTeam === 'defender');
  }

  _roster(team) {
    const rows = [];

    // Player
    if (this.game.player.team === team) {
      rows.push({
        name: 'YOU (' + this.game.selectedAgent.name + ')',
        agent: this.game.selectedAgent,
        kills: this.game.gameManager.stats.kills,
        deaths: this.game.gameManager.stats.deaths,
        assists: this.game.gameManager.stats.assists,
        credits: this.game.gameManager.credits,
        isPlayer: true,
      });
    }

    // Bots
    for (const bot of this.game.bots) {
      if (bot.team !== team) continue;
      rows.push({
        name: bot.name,
        agentColor: bot.team === 'attacker' ? '#ff4655' : '#4A90D9',
        kills: bot.kills || 0,
        deaths: bot.deaths || 0,
        assists: bot.assists || 0,
        credits: bot.credits || 0,
        isPlayer: false,
      });
    }

    return rows.sort((a, b) => b.kills - a.kills);
  }

  _teamBlock(label, cls, rows, isPlayerTeam) {
    const header = `
      <div class="sb-team">
        <div class="sb-team-header ${cls}">${label}</div>
        <div class="sb-player-row header">
          <span>Agent</span><span></span>
          <span class="kda">K</span><span class="kda">D</span><span class="kda">A</span>
          <span>Credits</span>
        </div>
    `;
    const body = rows.map(r => {
      const color = r.agent ? r.agent.color : r.agentColor;
      const icon = r.agent ? r.agent.emoji : '🎭';
      return `
        <div class="sb-player-row ${r.isPlayer ? 'is-player' : ''}">
          <span class="agent-badge">
            <span style="width:20px;height:20px;border-radius:50%;background:${color};display:inline-flex;align-items:center;justify-content:center;font-size:11px;">${icon}</span>
            ${r.name}
          </span>
          <span></span>
          <span class="kda"><span class="k">${r.kills}</span></span>
          <span class="kda"><span class="d">${r.deaths}</span></span>
          <span class="kda"><span class="a">${r.assists}</span></span>
          <span class="credits-col">● ${r.credits}</span>
        </div>
      `;
    }).join('');

    return header + body + '</div>';
  }
}
