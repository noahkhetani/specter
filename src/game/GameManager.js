import * as THREE from 'three';

// Round phases
const PHASE = {
  BUY: 'buy',
  ACTIVE: 'active',
  END: 'end',
  GAMEOVER: 'gameover',
};

const BUY_TIME = 25;          // seconds
const ROUND_TIME = 100;       // 1:40
const END_TIME = 5;
const ROUNDS_TO_WIN = 13;     // first to 13 (best of 24 + OT)

// Economy
const ECON = {
  roundWin: 3000,
  roundLossBase: 1900,
  lossBonus: [1900, 2400, 2900],   // consecutive loss bonus
  killReward: 200,
  plantReward: 300,
  spikeDefuseReward: 300,
  maxCredits: 9000,
  startCredits: 800,
};

export class GameManager {
  constructor(game) {
    this.game = game;

    this.phase = PHASE.BUY;
    this.phaseTimer = BUY_TIME;
    this.roundNumber = 1;

    // Player is on attacker team for first half
    this.playerTeam = 'attacker';

    this.scores = { attacker: 0, defender: 0 };
    this.credits = ECON.startCredits;

    // Loss streak tracking
    this.lossStreak = { attacker: 0, defender: 0 };

    this.roundActive = false;
    this.spikePlanted = false;
    this.targetSite = null;     // bots coordinate here
    this.roundEndReason = '';

    // Stats
    this.stats = {
      kills: 0, deaths: 0, assists: 0,
    };

    this.bots = [];   // all bots reference
  }

  start() {
    this.phase = PHASE.BUY;
    this.phaseTimer = BUY_TIME;
    this.roundNumber = 1;
    this.scores = { attacker: 0, defender: 0 };
    this.credits = ECON.startCredits;
    this._startBuyPhase();
  }

  get isHalfTime() {
    return this.roundNumber === 13;
  }

  _startBuyPhase() {
    this.phase = PHASE.BUY;
    this.phaseTimer = BUY_TIME;
    this.roundActive = false;
    this.spikePlanted = false;
    this.targetSite = Math.random() < 0.5 ? 'a' : 'b';

    // Reset entities
    this.game.resetRound();
    this.game.abilitySystem.resetCharges();

    // Pistol round / eco
    this.game.hud.updateRound(this.roundNumber, this.scores, this.playerTeam);
    this.game.hud.updateCredits(this.credits);
    this.game.hud.setPhase('BUY PHASE');
    this.game.hud.showNotification(`ROUND ${this.roundNumber}`);
    this.game.audio.play('round_start');

    // Give spike to a random attacker (or player if attacker)
    this._assignSpike();

    // Auto-open buy menu
    this.game.buyMenu.open();
  }

  _assignSpike() {
    this.game.spike.reset();
    if (this.playerTeam === 'attacker') {
      // Give to player on round 1, otherwise random
      if (this.roundNumber === 1 || Math.random() < 0.4) {
        this.game.spike.giveToPlayer();
      } else {
        const attBots = this.game.bots.filter(b => b.team === 'attacker' && b.alive);
        if (attBots.length) this.game.spike.giveToBot(attBots[0]);
        else this.game.spike.giveToPlayer();
      }
    } else {
      const attBots = this.game.bots.filter(b => b.team === 'attacker' && b.alive);
      if (attBots.length) this.game.spike.giveToBot(attBots[0]);
    }
  }

  _startActivePhase() {
    this.phase = PHASE.ACTIVE;
    this.phaseTimer = ROUND_TIME;
    this.roundActive = true;
    this.game.buyMenu.close();
    this.game.hud.setPhase('');
    this.game.audio.play('round_start');
  }

  endRound(winner, reason) {
    if (this.phase === PHASE.END || this.phase === PHASE.GAMEOVER) return;

    this.phase = PHASE.END;
    this.phaseTimer = END_TIME;
    this.roundActive = false;
    this.roundEndReason = reason;

    this.scores[winner]++;

    // Economy
    this._awardEconomy(winner);

    // Update loss streaks
    const loser = winner === 'attacker' ? 'defender' : 'attacker';
    this.lossStreak[winner] = 0;
    this.lossStreak[loser] = Math.min(2, this.lossStreak[loser] + 1);

    // Show round end UI
    const playerWon = winner === this.playerTeam;
    this.game.hud.showRoundEnd(playerWon, reason);
    this.game.audio.play(playerWon ? 'round_win' : 'round_lose');

    // Check game over
    if (this.scores.attacker >= ROUNDS_TO_WIN || this.scores.defender >= ROUNDS_TO_WIN) {
      setTimeout(() => this._gameOver(), END_TIME * 1000);
    }
  }

  _awardEconomy(winner) {
    const playerWon = winner === this.playerTeam;
    if (playerWon) {
      this.addCredits(ECON.roundWin);
    } else {
      const bonus = ECON.lossBonus[this.lossStreak[this.playerTeam]] || ECON.roundLossBase;
      this.addCredits(bonus);
    }
    this.game.hud.updateCredits(this.credits);
  }

  _gameOver() {
    this.phase = PHASE.GAMEOVER;
    const playerWon = this.scores[this.playerTeam] >= ROUNDS_TO_WIN;
    this.game.onGameOver(playerWon, this.scores);
    if (playerWon) this.game.audio.play('game_win');
  }

  _nextRound() {
    this.roundNumber++;

    // Half-time team swap
    if (this.roundNumber === 13) {
      this.playerTeam = this.playerTeam === 'attacker' ? 'defender' : 'attacker';
      this.game.player.team = this.playerTeam;
      this.game.swapBotTeams();
      this.game.hud.showNotification('SIDE SWAP');
    }

    this.game.hud.hideRoundEnd();
    this._startBuyPhase();
  }

  // ─── Economy API ───
  addCredits(amount) {
    this.credits = Math.min(ECON.maxCredits, this.credits + amount);
    this.game.hud.updateCredits(this.credits);
    this.game.buyMenu.refresh();
  }

  spendCredits(amount) {
    if (this.credits < amount) return false;
    this.credits -= amount;
    this.game.hud.updateCredits(this.credits);
    this.game.buyMenu.refresh();
    return true;
  }

  // ─── Event handlers ───
  onSpikePlanted() {
    this.spikePlanted = true;
    // Round timer no longer matters — spike timer takes over
    this.targetSite = this.game.spike.plantedSite;
  }

  onSpikeDefused() {
    this.endRound('defender', 'Spike Defused');
  }

  onSpikeExploded() {
    this.endRound('attacker', 'Spike Detonated');
  }

  onKill(killer, victim) {
    // Award credits to killer's side
    if (killer === this.game.player) {
      this.addCredits(ECON.killReward);
      this.stats.kills++;
      this.game.abilitySystem.addUltPoint();
    }
    if (victim === this.game.player) {
      this.stats.deaths++;
    }

    // Check round-end by elimination
    this._checkEliminationWin();
  }

  _checkEliminationWin() {
    const attackersAlive = this._teamAlive('attacker');
    const defendersAlive = this._teamAlive('defender');

    if (attackersAlive === 0 && !this.spikePlanted) {
      this.endRound('defender', 'Attackers Eliminated');
    } else if (defendersAlive === 0) {
      if (this.spikePlanted) {
        // Defenders dead but spike planted — attackers must let it tick OR already win
        this.endRound('attacker', 'Defenders Eliminated');
      } else {
        this.endRound('attacker', 'Defenders Eliminated');
      }
    }
  }

  _teamAlive(team) {
    let count = 0;
    if (this.game.player.team === team && this.game.player.alive) count++;
    for (const bot of this.game.bots) {
      if (bot.team === team && bot.alive) count++;
    }
    return count;
  }

  update(dt) {
    if (this.phase === PHASE.GAMEOVER) return;

    this.phaseTimer -= dt;

    // Update timer display
    if (this.phase === PHASE.BUY) {
      this.game.hud.updateTimer(this.phaseTimer, 'buy');
      if (this.phaseTimer <= 0) {
        this._startActivePhase();
      }
    } else if (this.phase === PHASE.ACTIVE) {
      if (!this.spikePlanted) {
        this.game.hud.updateTimer(this.phaseTimer, 'active');
        // Time ran out — defenders win (attackers failed to plant)
        if (this.phaseTimer <= 0) {
          this.endRound('defender', 'Time Expired');
        }
      } else {
        // Spike planted — timer hidden, spike timer shown
        this.game.hud.updateTimer(null, 'planted');
      }
    } else if (this.phase === PHASE.END) {
      if (this.phaseTimer <= 0) {
        this._nextRound();
      }
    }
  }
}

export { ECON };
