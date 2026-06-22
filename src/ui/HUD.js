export class HUD {
  constructor(game) {
    this.game = game;
    this.el = {
      hud: document.getElementById('hud'),
      crosshair: document.getElementById('crosshair'),
      hpValue: document.getElementById('hp-value'),
      hpBar: document.getElementById('hp-bar'),
      armorValue: document.getElementById('armor-value'),
      armorType: document.getElementById('armor-type'),
      ammoCurrent: document.getElementById('ammo-current'),
      ammoReserve: document.getElementById('ammo-reserve'),
      weaponName: document.getElementById('weapon-name'),
      reloadIndicator: document.getElementById('reload-indicator'),
      weaponSlots: document.getElementById('weapon-slots'),
      scoreT: document.getElementById('score-t'),
      scoreCt: document.getElementById('score-ct'),
      roundTimer: document.getElementById('round-timer'),
      roundLabel: document.getElementById('round-label'),
      phaseLabel: document.getElementById('phase-label'),
      killFeed: document.getElementById('kill-feed'),
      credits: document.getElementById('credits-display'),
      flash: document.getElementById('flash-overlay'),
      hitIndicator: document.getElementById('hit-indicator'),
      deathScreen: document.getElementById('death-screen'),
      killedByText: document.getElementById('killed-by-text'),
      roundEnd: document.getElementById('round-end'),
      roundResult: document.getElementById('round-result'),
      roundReason: document.getElementById('round-reason'),
      roundBonus: document.getElementById('round-bonus'),
      notification: document.getElementById('notification'),
      spikeCarrier: document.getElementById('spike-carrier-icon'),
      spikeTimerPanel: document.getElementById('spike-timer-panel'),
      spikeBar: document.getElementById('spike-bar'),
      spikeTimeText: document.getElementById('spike-time-text'),
      plantPanel: document.getElementById('plant-progress-panel'),
      plantBar: document.getElementById('plant-bar'),
      plantLabel: document.getElementById('plant-action-label'),
      interactPrompt: document.getElementById('interact-prompt'),
      siteIndicator: document.getElementById('site-indicator'),
      // ability slots
      abC: { icon: document.getElementById('ability-c-icon'), charges: document.getElementById('ability-c-charges'), slot: document.getElementById('slot-c') },
      abQ: { icon: document.getElementById('ability-q-icon'), charges: document.getElementById('ability-q-charges'), slot: document.getElementById('slot-q') },
      abE: { icon: document.getElementById('ability-e-icon'), charges: document.getElementById('ability-e-charges'), slot: document.getElementById('slot-e') },
      abX: { icon: document.getElementById('ability-x-icon'), charges: document.getElementById('ability-x-charges'), slot: document.getElementById('slot-x') },
      ultFill: document.getElementById('ult-fill'),
    };

    this._notifTimeout = null;
    this._flashOpacity = 0;
  }

  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }

  updateHealth(hp, armor, maxArmor) {
    this.el.hpValue.textContent = Math.ceil(hp);
    const pct = Math.max(0, hp) / 100 * 100;
    this.el.hpBar.style.width = pct + '%';
    this.el.hpBar.style.background = hp > 50 ? '#4CAF50' : hp > 25 ? '#FFA500' : '#FF4655';

    this.el.armorValue.textContent = Math.ceil(armor);
    if (armor <= 0) {
      this.el.armorType.textContent = 'No Shield';
    } else if (maxArmor >= 50) {
      this.el.armorType.textContent = 'Heavy Shield';
    } else {
      this.el.armorType.textContent = 'Light Shield';
    }
  }

  updateAmmo(mag, reserve, name, isMelee) {
    if (isMelee) {
      this.el.ammoCurrent.textContent = '∞';
      this.el.ammoReserve.textContent = '';
    } else {
      this.el.ammoCurrent.textContent = mag;
      this.el.ammoReserve.textContent = reserve;
    }
    this.el.weaponName.textContent = name.toUpperCase();
  }

  setReloading(on) {
    this.el.reloadIndicator.textContent = on ? 'RELOADING...' : '';
  }

  updateWeaponSlots(loadout, currentSlot) {
    const slots = [
      { key: '1', slot: 'primary', id: loadout.primary },
      { key: '2', slot: 'sidearm', id: loadout.sidearm },
      { key: '3', slot: 'melee', id: loadout.melee },
    ];
    this.el.weaponSlots.innerHTML = slots
      .filter(s => s.id)
      .map(s => {
        const name = this.game.getWeaponName(s.id);
        const active = s.slot === currentSlot ? 'active' : '';
        return `<div class="weapon-slot-item ${active}"><span class="weapon-slot-num">${s.key}</span>${name}</div>`;
      }).join('');
  }

  updateAbilities(agent, charges, ultPoints, ultRequired) {
    const map = { c: this.el.abC, q: this.el.abQ, e: this.el.abE, x: this.el.abX };
    ['c', 'q', 'e'].forEach(key => {
      const ab = agent.abilities[key];
      const el = map[key];
      el.icon.firstChild ? (el.icon.textContent = ab.icon) : (el.icon.textContent = ab.icon);
      el.charges.textContent = charges[key];
      if (charges[key] <= 0) el.slot.classList.add('on-cooldown');
      else el.slot.classList.remove('on-cooldown');
    });
    // Ult
    this.el.abX.charges.textContent = `${ultPoints}/${ultRequired}`;
    this.el.ultFill.style.width = (ultPoints / ultRequired * 100) + '%';
    if (ultPoints >= ultRequired) this.el.abX.slot.classList.remove('on-cooldown');
    else this.el.abX.slot.classList.add('on-cooldown');
  }

  updateRound(roundNum, scores, playerTeam) {
    this.el.roundLabel.textContent = `ROUND ${roundNum}`;
    // Show player's team score on appropriate side
    this.el.scoreT.textContent = scores.attacker;
    this.el.scoreCt.textContent = scores.defender;
  }

  updateCredits(credits) {
    this.el.credits.textContent = credits;
  }

  updateTimer(seconds, mode) {
    if (mode === 'planted') {
      this.el.roundTimer.style.visibility = 'hidden';
      return;
    }
    this.el.roundTimer.style.visibility = 'visible';
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, '0');
    this.el.roundTimer.textContent = `${m}:${sec}`;

    this.el.roundTimer.classList.remove('critical', 'buy-phase');
    if (mode === 'buy') this.el.roundTimer.classList.add('buy-phase');
    else if (s <= 10) this.el.roundTimer.classList.add('critical');
  }

  setPhase(text) {
    this.el.phaseLabel.textContent = text;
  }

  addKillFeed(killer, victim, weapon, isHeadshot, isPlayerKill) {
    const entry = document.createElement('div');
    entry.className = 'kill-entry' + (isPlayerKill ? ' player-kill' : '');
    entry.innerHTML = `
      <span class="killer">${killer}</span>
      <span class="weapon">${isHeadshot ? '◆' : '›'} ${weapon}</span>
      <span class="victim">${victim}</span>
    `;
    this.el.killFeed.prepend(entry);
    setTimeout(() => entry.remove(), 5000);
    // Limit entries
    while (this.el.killFeed.children.length > 5) {
      this.el.killFeed.lastChild.remove();
    }
  }

  showHitMarker(isKill) {
    const hi = this.el.hitIndicator;
    hi.classList.remove('active');
    void hi.offsetWidth;  // reflow
    hi.classList.add('active');
    if (isKill) {
      hi.style.filter = 'hue-rotate(0deg) brightness(1.5)';
    } else {
      hi.style.filter = 'none';
    }
  }

  flashDamage(fromPosition) {
    // Red vignette pulse
    this.el.flash.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.4) 100%)';
    this.el.flash.style.opacity = '1';
    setTimeout(() => {
      this.el.flash.style.opacity = '0';
      this.el.flash.style.background = 'white';
    }, 120);
  }

  setFlashBlind(amount) {
    // White flash overlay (from flashbangs)
    this.el.flash.style.background = 'white';
    this.el.flash.style.opacity = Math.min(1, amount).toString();
  }

  showNotification(text) {
    this.el.notification.textContent = text;
    this.el.notification.classList.add('show');
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      this.el.notification.classList.remove('show');
    }, 2000);
  }

  setCrosshairSpread(spreading) {
    if (spreading) this.el.crosshair.classList.add('spread');
    else this.el.crosshair.classList.remove('spread');
  }

  setScoped(scoped, style) {
    // style: 'sniper' | 'rifle' | null/undefined (other ADS or hip-fire)
    const overlay = this.el.scopeOverlay || (this.el.scopeOverlay = document.getElementById('scope-overlay'));

    if (scoped && style === 'sniper') {
      // Full tube scope — its own reticle is the crosshair, hide the HUD one
      overlay.className = 'sniper active';
      this.el.crosshair.style.display = 'none';
    } else if (scoped && style === 'rifle') {
      // Combat optic — show overlay AND keep the HUD crosshair
      overlay.className = 'rifle active';
      this.el.crosshair.style.display = 'block';
      this.el.crosshair.classList.add('ads');
    } else {
      // Hip-fire, or ADS on pistols/SMGs — always show the crosshair
      overlay.className = '';
      this.el.crosshair.style.display = 'block';
      this.el.crosshair.classList.toggle('ads', !!scoped);
    }
  }

  // ─── Spike UI ───
  setSpikeCarrier(has) {
    if (has) this.el.spikeCarrier.classList.add('active');
    else this.el.spikeCarrier.classList.remove('active');
  }

  setSpikeTimer(visible, time, max) {
    if (!visible) {
      this.el.spikeTimerPanel.classList.remove('visible');
      return;
    }
    this.el.spikeTimerPanel.classList.add('visible');
    this.el.spikeBar.style.width = (time / max * 100) + '%';
    const s = Math.max(0, Math.ceil(time));
    this.el.spikeTimeText.textContent = `0:${s.toString().padStart(2, '0')}`;
  }

  setPlantProgress(visible, progress, label) {
    if (!visible) {
      this.el.plantPanel.classList.remove('visible');
      return;
    }
    this.el.plantPanel.classList.add('visible');
    this.el.plantBar.style.width = (progress * 100) + '%';
    if (label) this.el.plantLabel.textContent = label;
  }

  setInteractPrompt(text) {
    if (text) {
      this.el.interactPrompt.textContent = text;
      this.el.interactPrompt.classList.add('visible');
    } else {
      this.el.interactPrompt.classList.remove('visible');
    }
  }

  // ─── Death / Round End ───
  showDeath(killerName) {
    this.el.killedByText.textContent = `Killed by ${killerName}`;
    this.el.deathScreen.classList.add('active');
  }

  hideDeath() {
    this.el.deathScreen.classList.remove('active');
  }

  showRoundEnd(playerWon, reason) {
    this.el.roundResult.textContent = playerWon ? 'ROUND WON' : 'ROUND LOST';
    this.el.roundResult.className = 'result ' + (playerWon ? 'win' : 'loss');
    this.el.roundReason.textContent = reason;
    this.el.roundEnd.classList.add('active');
  }

  hideRoundEnd() {
    this.el.roundEnd.classList.remove('active');
  }
}
