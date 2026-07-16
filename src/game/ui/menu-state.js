// Pure menu state machine (B1/B2/B3) — no DOM, unit-testable in node.
// Screens are builder functions: (ctx) => { title, subtitle?, items: [...] }
// Item shapes:
//   { type: 'action',  id, label, arg?, disabled?, note? }
//   { type: 'submenu', id, label, screen }
//   { type: 'slider',  id, label, value, min, max, step }
//   { type: 'toggle',  id, label, value }
//   { type: 'select',  id, label, value, options: [...] }
//   { type: 'text',    label }                    (not selectable)

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

export class MenuState {
    /**
     * @param {Object<string, function>} screens builder map
     * @param {object} ctx passed to every builder (live game state accessors)
     */
    constructor(screens, ctx) {
        this.screens = screens;
        this.ctx = ctx;
        this.stack = [];
        this.sel = 0;
    }

    get isOpen() {
        return this.stack.length > 0;
    }

    get screenName() {
        return this.stack.length ? this.stack[this.stack.length - 1] : null;
    }

    /** Current screen definition (rebuilt each call so values stay live). */
    view() {
        const name = this.screenName;
        if (!name || !this.screens[name]) return { title: '', items: [] };
        return this.screens[name](this.ctx);
    }

    _selectable(items) {
        return items.map((it, i) => ({ it, i })).filter(({ it }) => it.type !== 'text' && !it.disabled);
    }

    _firstEnabled() {
        const s = this._selectable(this.view().items);
        return s.length ? s[0].i : 0;
    }

    open(name) {
        this.stack = [name];
        this.sel = this._firstEnabled();
    }

    push(name) {
        this.stack.push(name);
        this.sel = this._firstEnabled();
    }

    /** Pop one screen; returns whether a screen is still open. */
    back() {
        this.stack.pop();
        this.sel = this.isOpen ? this._firstEnabled() : 0;
        return this.isOpen;
    }

    close() {
        this.stack = [];
        this.sel = 0;
    }

    /** Move selection up/down, skipping text/disabled rows, wrapping. */
    move(dir) {
        const items = this.view().items;
        const sel = this._selectable(items);
        if (!sel.length) return;
        const pos = sel.findIndex(({ i }) => i === this.sel);
        const next = ((pos < 0 ? 0 : pos + dir) + sel.length) % sel.length;
        this.sel = sel[next].i;
    }

    current() {
        return this.view().items[this.sel] || null;
    }

    /**
     * Left/right on a slider / toggle / select.
     * @returns {null | {type:'set', id, value}}
     */
    adjust(dir) {
        const it = this.current();
        if (!it) return null;
        if (it.type === 'slider') {
            const value = clamp(
                Math.round((it.value + dir * it.step) * 1000) / 1000,
                it.min, it.max
            );
            return { type: 'set', id: it.id, value };
        }
        if (it.type === 'toggle') return { type: 'set', id: it.id, value: !it.value };
        if (it.type === 'select') {
            const i = it.options.indexOf(it.value);
            const n = ((i < 0 ? 0 : i + dir) + it.options.length) % it.options.length;
            return { type: 'set', id: it.id, value: it.options[n] };
        }
        return null;
    }

    /**
     * Enter/click on the current item.
     * @returns {null | {type:'set',...} | {type:'action', id, arg} | {type:'push', screen}}
     */
    activate() {
        const it = this.current();
        if (!it || it.disabled || it.type === 'text') return null;
        if (it.type === 'submenu') {
            this.push(it.screen);
            return { type: 'push', screen: it.screen };
        }
        if (it.type === 'toggle') return { type: 'set', id: it.id, value: !it.value };
        if (it.type === 'select') return this.adjust(1);
        if (it.type === 'slider') return null; // sliders adjust with left/right only
        return { type: 'action', id: it.id, arg: it.arg };
    }
}
