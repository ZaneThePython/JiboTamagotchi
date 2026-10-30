'use strict';

const jibo = require('jibo'), BeSkill = require('@be/be-framework').BeSkill;
const lifecycle = require('./touch-lifecycle'), UI = require('./ui'), Pet = require('./pet');

const STORE_KEY = 'be.tamagotchi.pet';
const SAID_MS = 2500; // how long the pet's reaction stays on screen

class TamagotchiSkill extends BeSkill {
    constructor() { super(...arguments); this.generation = 0; this.view = null; this.closing = null; }
    open() {
        if (this.view) { this.close(error => { if (!error) this.open(); }); return; }
        const generation = ++this.generation, views = jibo.face.views, now = Date.now();
        let saved = null; try { saved = global.localStorage.getItem(STORE_KEY); } catch (_) {}
        this.pet = Pet.advance(Pet.load(saved, now), now); this.save();
        this.closing = null; this.leaving = false; this.said = ''; this.saidUntil = 0; this.started = now;
        this.ui = new UI({ act: action => {
            const result = Pet.act(this.pet, action, Date.now());
            this.pet = result.pet; this.save();
            this.said = result.said; this.saidUntil = Date.now() + SAID_MS;
            this.render();
        } });
        const view = this.view = lifecycle.prepareView(views.createView('View', this.ui.config(views)));
        view.addAction(views.ActionData.CALLBACK, { callback: () => this.leave() }, true, false, views.GESTURE.SWIPE_DOWN);
        const current = () => generation === this.generation && !this.leaving && !!this.view;
        views.changeView({ addView: view, transitionOpen: views.TRANSITION.IN, transitionClose: views.TRANSITION.OUT },
            () => { if (current()) this.interval = setInterval(() => this.render(), 50); },
            () => { if (current()) this.leave(); },
            () => { if (current()) { this.ui.decorate(view, global.PIXI); this.render(); } });
    }
    render() {
        if (!this.ui) return;
        const now = Date.now(), stage = Pet.stage(this.pet, now);
        this.pet = Pet.advance(this.pet, now);
        if (this.lastStage === 'egg' && stage !== 'egg') { this.said = 'It hatched!'; this.saidUntil = now + SAID_MS; }
        this.lastStage = stage;
        if (now > this.saidUntil) this.said = '';
        const mood = Pet.mood(this.pet);
        this.ui.render({ pet: this.pet, stage: stage, mood: mood, age: Pet.age(this.pet, now),
            said: this.said || (mood === 'dead' ? 'Tap a button for a new egg' : '') },
            (now - this.started) / 1000);
    }
    save() { try { global.localStorage.setItem(STORE_KEY, JSON.stringify(this.pet)); } catch (_) {} }
    leave() { if (this.leaving) return; this.leaving = true; this.exit({ noElementsOfSurprise: true }); }
    close(done) {
        done = done || (() => {});
        if (this.closing) {
            if (this.closing.finished) done(this.closing.error); else this.closing.callbacks.push(done);
            return;
        }
        const closing = this.closing = { finished: false, error: null, callbacks: [done] };
        ++this.generation; this.leaving = true; clearInterval(this.interval); this.interval = null;
        if (this.pet) this.save();
        lifecycle.closeView(jibo.face.views, jibo.face.tween, this.view, require('timers'), 'tamagotchi', error => {
            closing.finished = true; closing.error = error || null;
            if (!error) { this.view = null; this.ui = null; }
            closing.callbacks.splice(0).forEach(callback => callback(closing.error));
        });
    }
    destroy(done) { this.close(error => super.destroy(baseError => done(error || baseError))); }
}

module.exports = TamagotchiSkill;
