'use strict';

// Pure pet rules (no Jibo APIs): stats run 0..100 and drift with real time, including while
// the skill is closed. If the skill isn't opened for DEATH_MS the pet dies; any button then starts a new egg.
const HOUR = 3600000, DAY = 24 * HOUR;
const RATES = { // per hour
    awake: { food: -6, fun: -4, energy: -3 },
    asleep: { food: -2, fun: -1, energy: 25 }
};
const HATCH_MS = 60000; // the egg hatches a minute after the first visit
const DEATH_MS = 4 * DAY; // `last` is saved whenever the skill opens or closes
const clamp = v => Math.max(0, Math.min(100, v));

function create(now) { return { born: now, last: now, food: 80, fun: 80, energy: 80, asleep: false }; }

// Saved state comes from localStorage: anything malformed starts a new pet.
function load(raw, now) {
    let s = null;
    try { s = JSON.parse(raw); } catch (_) {}
    const num = v => typeof v === 'number' && isFinite(v);
    if (!s || !num(s.born) || !num(s.last) || !num(s.food) || !num(s.fun) || !num(s.energy) || s.born > now) return create(now);
    return { born: s.born, last: Math.min(s.last, now), food: clamp(s.food), fun: clamp(s.fun), energy: clamp(s.energy), asleep: !!s.asleep, dead: !!s.dead };
}

// Advance to `now`; a sleeping pet wakes on its own once fully rested.
function advance(pet, now) {
    const s = Object.assign({}, pet);
    if (s.dead) return s;
    if (now - s.last >= DEATH_MS) return Object.assign(s, { dead: true, asleep: false, food: 0, fun: 0, energy: 0, last: now });
    let ms = Math.max(0, now - Math.max(s.last, s.born + HATCH_MS)); // needs only start once hatched
    if (stage(s, now) === 'egg') { s.last = now; return s; }
    while (ms > 0) {
        const r = RATES[s.asleep ? 'asleep' : 'awake'];
        const untilRested = s.asleep ? (100 - s.energy) / r.energy * HOUR : Infinity;
        const step = Math.min(ms, untilRested), h = step / HOUR;
        s.food = clamp(s.food + r.food * h); s.fun = clamp(s.fun + r.fun * h); s.energy = clamp(s.energy + r.energy * h);
        ms -= step;
        if (step === untilRested) { s.energy = 100; s.asleep = false; } // wakes up on its own once rested
    }
    s.last = now;
    return s;
}

function stage(pet, now) {
    const age = now - pet.born;
    return age < HATCH_MS ? 'egg' : age < DAY ? 'baby' : age < 3 * DAY ? 'kid' : 'grown';
}

function mood(pet) {
    if (pet.dead) return 'dead';
    if (pet.asleep) return 'asleep';
    const low = Math.min(pet.food, pet.fun, pet.energy);
    return low >= 60 ? 'happy' : low >= 25 ? 'okay' : 'sad';
}

// Actions return { pet, said } so the UI can show the pet's reaction.
function act(pet, action, now) {
    const s = advance(pet, now);
    if (s.dead) return { pet: create(now), said: 'A new egg!' };
    if (stage(s, now) === 'egg') return { pet: s, said: 'The egg wiggles…' };
    if (s.asleep && action !== 'sleep') return { pet: s, said: 'Shh, sleeping…' };
    if (action === 'feed') {
        if (s.food >= 95) { s.fun = clamp(s.fun - 5); return { pet: s, said: 'Too full!' }; }
        s.food = clamp(s.food + 25); return { pet: s, said: 'Yum!' };
    }
    if (action === 'play') {
        if (s.energy < 15) return { pet: s, said: 'Too sleepy to play…' };
        s.fun = clamp(s.fun + 20); s.energy = clamp(s.energy - 10); s.food = clamp(s.food - 5);
        return { pet: s, said: 'Wheee!' };
    }
    if (action === 'sleep') {
        if (s.asleep) { s.asleep = false; return { pet: s, said: 'Good morning!' }; }
        if (s.energy >= 90) return { pet: s, said: 'Not tired!' };
        s.asleep = true; return { pet: s, said: 'Goodnight…' };
    }
    return { pet: s, said: '' };
}

function age(pet, now) {
    const days = Math.floor((now - pet.born) / DAY);
    return days === 0 ? 'Today' : days === 1 ? '1 day old' : days + ' days old';
}

module.exports = { HOUR, DAY, HATCH_MS, DEATH_MS, create, load, advance, stage, mood, act, age };
