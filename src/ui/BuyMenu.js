import { WEAPONS, WEAPON_CATEGORIES, ARMOR } from '../config/weapons.js';

export class BuyMenu {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.activeCategory = 'rifle';
    this.selectedItem = null;

    this.el = {
      menu: document.getElementById('buy-menu'),
      credits: document.getElementById('buy-credits-val'),
      categories: document.getElementById('buy-categories'),
      items: document.getElementById('buy-items'),
      detail: document.getElementById('buy-detail'),
      detailName: document.getElementById('detail-name'),
      detailStats: document.getElementById('detail-stats'),
      confirmBtn: document.getElementById('buy-confirm-btn'),
    };

    this._buildCategories();
    this.el.confirmBtn.addEventListener('click', () => this._confirmPurchase());
  }

  _buildCategories() {
    const cats = [
      { id: 'armor', label: 'Shields' },
      { id: 'pistol', label: 'Pistols' },
      { id: 'smg', label: 'SMGs' },
      { id: 'shotgun', label: 'Shotguns' },
      { id: 'rifle', label: 'Rifles' },
      { id: 'sniper', label: 'Snipers' },
      { id: 'machine', label: 'Heavy' },
      { id: 'ability', label: 'Abilities' },
    ];
    this.el.categories.innerHTML = cats.map(c =>
      `<button class="buy-cat-btn ${c.id === this.activeCategory ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`
    ).join('');

    this.el.categories.querySelectorAll('.buy-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.cat;
        this._buildCategories();
        this._buildItems();
      });
    });
  }

  _buildItems() {
    let items = [];

    if (this.activeCategory === 'armor') {
      items = Object.values(ARMOR).map(a => ({
        id: a.id, name: a.name, price: a.price, icon: a.icon,
        category: 'shield', isArmor: true,
      }));
    } else if (this.activeCategory === 'ability') {
      const agent = this.game.selectedAgent;
      items = ['c', 'q', 'e'].map(slot => {
        const ab = agent.abilities[slot];
        return {
          id: 'ability_' + slot, name: ab.name, price: ab.price, icon: ab.icon,
          category: `${slot.toUpperCase()} Ability`, isAbility: true, slot,
        };
      });
    } else {
      items = Object.values(WEAPONS)
        .filter(w => w.category === this.activeCategory)
        .map(w => ({ id: w.id, name: w.name, price: w.price, icon: w.icon, category: w.category }));
    }

    this.el.items.innerHTML = items.map(item => {
      const owned = this._isOwned(item);
      const afford = this.game.gameManager.credits >= item.price;
      const cls = [owned ? 'owned' : '', !afford && !owned ? 'cant-afford' : ''].join(' ');
      const priceCls = item.price === 0 ? 'free' : '';
      const priceText = item.price === 0 ? 'FREE' : item.price;
      return `
        <div class="buy-item ${cls}" data-id="${item.id}">
          <div>
            <div class="item-name">${item.name}</div>
            <div class="item-category">${item.category}</div>
          </div>
          <div class="item-icon">${item.icon}</div>
          <div class="item-price ${priceCls}">${owned ? 'OWNED' : '● ' + priceText}</div>
        </div>
      `;
    }).join('');

    this.el.items.querySelectorAll('.buy-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = items.find(i => i.id === el.dataset.id);
        this._selectItem(item, el);
      });
      el.addEventListener('dblclick', () => {
        const item = items.find(i => i.id === el.dataset.id);
        this._selectItem(item, el);
        this._confirmPurchase();
      });
    });
  }

  _isOwned(item) {
    if (item.isArmor) return false;
    if (item.isAbility) {
      const max = this.game.selectedAgent.abilities[item.slot].charges;
      return this.game.abilitySystem.charges[item.slot] >= max;
    }
    const ws = this.game.weaponSystem;
    return ws.loadout.primary === item.id || ws.loadout.sidearm === item.id;
  }

  _selectItem(item, el) {
    this.selectedItem = item;
    this.el.items.querySelectorAll('.buy-item').forEach(e => e.classList.remove('selected'));
    if (el) el.classList.add('selected');

    this.el.detailName.textContent = item.name;

    // Stats
    if (item.isArmor) {
      const a = ARMOR[item.id];
      this.el.detailStats.innerHTML = this._statRow('Armor Points', a.hp, 50);
    } else if (item.isAbility) {
      const ab = this.game.selectedAgent.abilities[item.slot];
      this.el.detailStats.innerHTML = `<div style="font-size:12px;color:var(--muted);line-height:1.5">${ab.desc}</div>`;
    } else {
      const w = WEAPONS[item.id];
      this.el.detailStats.innerHTML =
        this._statRow('Damage', w.damage.body, 70) +
        this._statRow('Fire Rate', w.fireRate, 16) +
        this._statRow('Magazine', w.magSize, 50) +
        this._statRow('Wall Pen', this._penValue(w.penetration), 3);
    }

    const afford = this.game.gameManager.credits >= item.price;
    const owned = this._isOwned(item);
    this.el.confirmBtn.disabled = !afford || owned;
    this.el.confirmBtn.textContent = owned ? 'Owned' : (afford ? `Buy — ● ${item.price}` : 'Cannot Afford');
  }

  _penValue(pen) {
    return { none: 0, low: 1, medium: 2, high: 3 }[pen] || 0;
  }

  _statRow(label, val, max) {
    const pct = Math.min(100, (val / max) * 100);
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-bar"><span class="stat-fill" style="width:${pct}%"></span></span>
      </div>
    `;
  }

  _confirmPurchase() {
    if (!this.selectedItem) return;
    const item = this.selectedItem;
    if (this._isOwned(item)) return;
    if (this.game.gameManager.credits < item.price) return;

    if (item.isArmor) {
      this.game.gameManager.spendCredits(item.price);
      this.game.player.setArmor(ARMOR[item.id].hp);
    } else if (item.isAbility) {
      this.game.abilitySystem.buyAbility(item.slot);
    } else {
      this.game.gameManager.spendCredits(item.price);
      this.game.weaponSystem.giveWeapon(item.id);
    }

    this.game.audio.play('buy_success');
    this.refresh();
  }

  open() {
    if (this.game.gameManager.phase !== 'buy') return;
    this.isOpen = true;
    this.el.menu.classList.add('open');
    this.game.input.unlockPointer();
    document.getElementById('game-canvas').style.cursor = 'default';
    this.activeCategory = this.game.gameManager.roundNumber === 1 ? 'pistol' : 'rifle';
    this._buildCategories();
    this._buildItems();
    this.refresh();
  }

  close() {
    this.isOpen = false;
    this.el.menu.classList.remove('open');
    document.getElementById('game-canvas').style.cursor = 'none';
    // Re-lock pointer
    const canvas = document.getElementById('game-canvas');
    if (this.game.state === 'playing') canvas.requestPointerLock();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  refresh() {
    this.el.credits.textContent = this.game.gameManager.credits;
    if (this.isOpen) this._buildItems();
  }
}
