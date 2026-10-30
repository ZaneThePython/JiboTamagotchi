'use strict';

const path = require('path');

// Native Jibo face (black, Proxima Nova, stock ActionButtons and ListProgress colors) with the
// pet drawn live in PIXI on the left and its three needs as bars on the right.
const GRAY = [0x58586D, 0x282735], CYAN = [0x25F2FB, 0x107799];
const res = name => path.join(__dirname, 'resources', name + '.png');
const PET = { x: 400, y: 400 };
const BARS = [['food', 'Food', 0xFFB347], ['fun', 'Fun', 0xFF6FA8], ['energy', 'Energy', 0x25F2FB]];
const BAR = { x: 760, w: 420, h: 22, y: i => 120 + i * 105 };
const BUTTONS = [['feed', 'Feed', 760], ['play', 'Play', 904], ['sleep', 'Sleep', 1048]];
const BODY = { baby: [0x9CF4F7, 70], kid: [0x5FDDE6, 95], grown: [0x2FC1DC, 120] }; // colour, radius

class UI {
    constructor(actions) { this.actions = actions; }
    config(views) {
        const components = [];
        const callback = fn => ({ type: views.ActionData.CALLBACK, data: { callback: fn } });
        const label = (id, x, y, size, font, anchor) => components.push({ type: 'Label', id: id, text: '',
            position: { x: x, y: y }, targetAnchor: anchor || { x: 0.5, y: 0.5 },
            style: { fontFamily: font, fontSize: size, fill: '#FFFFFF', fontWeight: size >= 60 ? 'bold' : 'normal' } });
        label('title', PET.x, 70, 48, 'Proxima Nova Soft');
        label('said', PET.x, 650, 44, 'Proxima Nova Light');
        BARS.forEach((b, i) => label(b[0] + 'Label', BAR.x, BAR.y(i) - 32, 36, 'Proxima Nova Light', { x: 0, y: 0.5 }));
        BUTTONS.forEach(b => {
            components.push({ type: 'ActionButton', id: b[0], iconSrc: res(b[0]), colors: GRAY,
                position: { x: b[2], y: 440 }, transform: { scaleX: 0.5, scaleY: 0.5 }, action: callback(() => this.actions.act(b[0])) });
            label(b[0] + 'Caption', b[2] + 66, 610, 36, 'Proxima Nova Light');
        });
        return { viewConfig: { type: 'View', id: 'tamagotchi', category: 'gui', ignoreSwipeDown: true, transitionStageOnly: true },
            componentConfigs: components };
    }
    decorate(view, PIXI) {
        this.view = view; this.PIXI = PIXI;
        const background = new PIXI.Graphics(); background.beginFill(0x000000); background.drawRect(0, 0, 1280, 720); background.endFill();
        view.stage.addChildAt(background, 0);
        this.bars = new PIXI.Graphics(); view.stage.addChild(this.bars);
        this.pet = new PIXI.Graphics(); view.stage.addChild(this.pet);
        this.zzz = new PIXI.Text('z z z', { fontFamily: 'Proxima Nova Soft', fontSize: 44, fill: '#9CF4F7' });
        view.stage.addChild(this.zzz);
    }
    text(id, value) { const c = this.view.getComponentById(id); if (c && c.text !== value) c.text = value; }
    // state: { pet, stage, mood, age, said }, t: seconds (drives the idle animation)
    render(state, t) {
        if (!this.view) return;
        const pet = state.pet;
        this.text('title', state.mood === 'dead' ? 'Gone…' : state.stage === 'egg' ? 'An egg!' : state.age);
        this.text('said', state.said || '');
        BARS.forEach(b => this.text(b[0] + 'Label', b[1]));
        BUTTONS.forEach(b => this.text(b[0] + 'Caption', b[0] === 'sleep' && pet.asleep ? 'Wake' : b[1]));
        const g = this.bars; g.clear();
        BARS.forEach((b, i) => {
            g.beginFill(0x21202b); g.drawRoundedRect(BAR.x, BAR.y(i), BAR.w, BAR.h, BAR.h / 2); g.endFill();
            const w = Math.max(BAR.h, BAR.w * pet[b[0]] / 100);
            g.beginFill(pet[b[0]] < 25 ? 0xE5484D : b[2]); g.drawRoundedRect(BAR.x, BAR.y(i), w, BAR.h, BAR.h / 2); g.endFill();
        });
        draw(this.pet, state.stage, state.mood, t);
        this.zzz.visible = state.mood === 'asleep';
        this.zzz.x = PET.x + 90; this.zzz.y = PET.y - 200 - 12 * Math.sin(t * 1.5);
    }
}

// The pet: a round blob that bounces when happy, droops when sad and dozes when asleep.
function draw(g, stage, mood, t) {
    g.clear();
    if (stage === 'egg' && mood !== 'dead') {
        const tilt = Math.sin(t * 9) * (Math.sin(t * 0.8) > 0.6 ? 0.25 : 0.03); // an occasional wobble
        g.beginFill(0xF3E9D2); drawTilted(g, PET.x, PET.y, 85, 110, tilt); g.endFill();
        g.beginFill(0x7FD8E0);
        [[-30, -40, 14], [25, -10, 18], [-20, 40, 12], [35, 50, 10]].forEach(s => drawTilted(g, PET.x + s[0], PET.y + s[1], s[2], s[2], 0));
        g.endFill();
        return;
    }
    const body = mood === 'dead' ? [0x6B6B78, BODY[stage === 'egg' ? 'baby' : stage][1]] : BODY[stage], r = body[1];
    const bounce = mood === 'happy' ? Math.abs(Math.sin(t * 3)) * 28 : mood === 'okay' ? Math.abs(Math.sin(t * 2)) * 10 : 0;
    const breathe = mood === 'asleep' ? Math.sin(t * 1.5) * 0.04 : 0;
    const cx = PET.x, cy = PET.y + 60 - r - bounce, squash = 1 + breathe - (mood === 'sad' ? 0.06 : 0);
    g.beginFill(0x000000, 0.35); g.drawEllipse(cx, PET.y + 70, r * 0.9 - bounce * 0.6, 14); g.endFill(); // shadow
    g.beginFill(body[0]);
    g.drawEllipse(cx - r * 0.45, cy + r * 0.85, r * 0.28, r * 0.16); g.drawEllipse(cx + r * 0.45, cy + r * 0.85, r * 0.28, r * 0.16); // feet
    g.drawEllipse(cx, cy, r, r * 0.92 * squash);
    g.endFill();
    if (stage === 'grown') { // antenna
        g.lineStyle(6, body[0]); g.moveTo(cx, cy - r * 0.9); g.lineTo(cx + 18, cy - r * 1.3); g.lineStyle(0);
        g.beginFill(0xFFB347); g.drawCircle(cx + 18, cy - r * 1.3, 12); g.endFill();
    }
    const eyeY = cy - r * 0.15 + (mood === 'sad' ? r * 0.08 : 0), eyeDx = r * 0.36, eye = r * 0.17;
    if (mood === 'dead') { // X eyes
        g.lineStyle(6, 0x1B2A33);
        [-1, 1].forEach(s => { const x = cx + s * eyeDx;
            g.moveTo(x - eye, eyeY - eye); g.lineTo(x + eye, eyeY + eye); g.moveTo(x + eye, eyeY - eye); g.lineTo(x - eye, eyeY + eye); });
        g.lineStyle(0);
    } else if (mood === 'asleep') {
        g.lineStyle(5, 0x1B2A33);
        [-1, 1].forEach(s => { g.moveTo(cx + s * eyeDx - eye, eyeY); g.lineTo(cx + s * eyeDx + eye, eyeY); });
        g.lineStyle(0);
    } else {
        const blink = (t % 4) < 0.12; // a quick blink every few seconds
        [-1, 1].forEach(s => {
            g.beginFill(0xFFFFFF); g.drawEllipse(cx + s * eyeDx, eyeY, eye, blink ? 2 : eye * 1.15); g.endFill();
            if (!blink) { g.beginFill(0x1B2A33); g.drawCircle(cx + s * eyeDx + 3, eyeY + 3, eye * 0.55); g.endFill(); }
        });
        if (mood === 'sad') { // worried brows
            g.lineStyle(5, 0x1B2A33);
            [-1, 1].forEach(s => { g.moveTo(cx + s * (eyeDx + eye), eyeY - eye * 1.6); g.lineTo(cx + s * (eyeDx - eye), eyeY - eye * 2.1); });
            g.lineStyle(0);
        }
    }
    if (mood === 'happy') { g.beginFill(0xFF8FB8, 0.7); [-1, 1].forEach(s => g.drawEllipse(cx + s * r * 0.62, cy + r * 0.12, r * 0.13, r * 0.08)); g.endFill(); }
    const my = cy + r * 0.32;
    g.lineStyle(5, 0x1B2A33);
    if (mood === 'happy') arc(g, cx, my - r * 0.12, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 'sad' || mood === 'dead') arc(g, cx, my + r * 0.16, r * 0.17, 1.2 * Math.PI, 1.8 * Math.PI);
    else if (mood === 'okay') { g.moveTo(cx - r * 0.14, my); g.lineTo(cx + r * 0.14, my); }
    g.lineStyle(0);
    if (mood === 'asleep') { g.beginFill(0x1B2A33); g.drawCircle(cx, my, r * 0.06); g.endFill(); }
}

// Start the arc at its own first point so PIXI does not join it to the previous stroke.
function arc(g, cx, cy, r, from, to) { g.moveTo(cx + r * Math.cos(from), cy + r * Math.sin(from)); g.arc(cx, cy, r, from, to); }

function drawTilted(g, cx, cy, rx, ry, tilt) {
    const pts = [];
    for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry * (a > Math.PI ? 1.08 : 1);
        pts.push(cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt));
    }
    g.drawPolygon(pts);
}

module.exports = UI;
