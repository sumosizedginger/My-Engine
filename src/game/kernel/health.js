// Health, i-frames, death.

/**
 * C2: hearts earned from boss kills — +1 max HP per 3 bosses defeated
 * (after 3, 6, 9, 12), on a base of 6.
 */
export function bossHeartMax(bossesDefeated, base = 6) {
    return base + Math.floor(Math.max(0, bossesDefeated) / 3);
}

export class HealthPool {
    constructor(max = 6) {
        this.max = max;
        this.hp = max;
        this.iFrames = 0;
        this.dead = false;
        this.onDeath = null;
        this.onDamage = null;
    }

    get ratio() {
        return this.max > 0 ? this.hp / this.max : 0;
    }

    /**
     * @returns {{ accepted:boolean, hp:number, dead:boolean }}
     */
    damage(amount, iFrameTime = 0.7) {
        if (this.dead || this.iFrames > 0 || amount <= 0) {
            return { accepted: false, hp: this.hp, dead: this.dead };
        }
        this.hp = Math.max(0, this.hp - amount);
        this.iFrames = iFrameTime;
        if (this.onDamage) this.onDamage(amount, this.hp);
        if (this.hp <= 0) {
            this.dead = true;
            if (this.onDeath) this.onDeath();
        }
        return { accepted: true, hp: this.hp, dead: this.dead };
    }

    heal(amount) {
        if (this.dead) return this.hp;
        this.hp = Math.min(this.max, this.hp + amount);
        return this.hp;
    }

    /**
     * Raise (or restore) the heart cap — C2 progression. Raising the cap
     * also fills the newly gained hearts; lowering clamps hp. Cap 12.
     */
    setMax(n) {
        const next = Math.max(1, Math.min(12, Math.floor(n)));
        const gained = next - this.max;
        this.max = next;
        if (gained > 0 && !this.dead) this.hp = Math.min(this.max, this.hp + gained);
        this.hp = Math.min(this.max, this.hp);
        return this.max;
    }

    fullRestore() {
        this.hp = this.max;
        this.dead = false;
        this.iFrames = 0;
    }

    update(dt) {
        if (this.iFrames > 0) this.iFrames = Math.max(0, this.iFrames - dt);
    }

    get invulnerable() {
        return this.iFrames > 0 || this.dead;
    }
}
