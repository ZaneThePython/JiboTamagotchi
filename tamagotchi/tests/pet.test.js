'use strict';
// node tests/pet.test.js  (Node 6 compatible)
const assert = require('assert');
const Pet = require('../pet');
const H = Pet.HOUR, near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, (msg || '') + ' ' + a + ' vs ' + b);

const born = 1000000, hatched = born + Pet.HATCH_MS;
let p = Pet.create(born);
assert.strictEqual(Pet.stage(p, born), 'egg');
assert.strictEqual(Pet.act(p, 'feed', born + 1000).said, 'The egg wiggles…', 'eggs cannot be fed');
p = Pet.advance(p, hatched);
assert.strictEqual(Pet.stage(p, hatched), 'baby');
near(p.food, 80, 'no hunger while still an egg');

// Needs drift with real time, also while the skill is closed, but never below zero.
let q = Pet.advance(p, hatched + 2 * H);
near(q.food, 68); near(q.fun, 72); near(q.energy, 74);
q = Pet.advance(p, hatched + 95 * H);
assert.deepStrictEqual([q.food, q.fun, q.energy], [0, 0, 0]);
assert.strictEqual(Pet.mood(Pet.advance(p, hatched + Pet.DEATH_MS - 1)), 'sad', 'neglected pets get sad');

// Not opened for 4 days: it dies, stays dead, and any button starts a new egg.
const dead = Pet.advance(p, hatched + Pet.DEATH_MS);
assert.strictEqual(Pet.mood(dead), 'dead');
assert.strictEqual(Pet.mood(Pet.load(JSON.stringify(dead), hatched + 9 * Pet.DAY)), 'dead', 'death survives a reload');
const reborn = Pet.act(dead, 'play', hatched + 5 * Pet.DAY);
assert.strictEqual(reborn.said, 'A new egg!');
assert.strictEqual(Pet.stage(reborn.pet, hatched + 5 * Pet.DAY), 'egg'); assert.ok(!reborn.pet.dead);

// Sleep restores energy and the pet wakes by itself once rested.
let r = Pet.act(Object.assign({}, p, { energy: 50 }), 'sleep', hatched);
assert.strictEqual(r.pet.asleep, true); assert.strictEqual(Pet.mood(r.pet), 'asleep');
let s = Pet.advance(r.pet, hatched + 1 * H);
near(s.energy, 75); assert.strictEqual(s.asleep, true);
s = Pet.advance(r.pet, hatched + 5 * H);
assert.strictEqual(s.asleep, false); assert.strictEqual(s.energy, 100 - 3 * 3, 'woke at 2 h, then 3 h awake');
near(s.food, 80 - 2 * 2 - 6 * 3, 'slower hunger while asleep');
assert.strictEqual(Pet.act(r.pet, 'feed', hatched).said, 'Shh, sleeping…');
assert.strictEqual(Pet.act(r.pet, 'sleep', hatched).pet.asleep, false, 'tapping Wake wakes it');
assert.strictEqual(Pet.act(Object.assign({}, p, { energy: 95 }), 'sleep', hatched).said, 'Not tired!');

// Feeding, playing and their limits.
assert.strictEqual(Pet.act(p, 'feed', hatched).pet.food, 100);
const full = Pet.act(Object.assign({}, p, { food: 98 }), 'feed', hatched);
assert.strictEqual(full.said, 'Too full!'); assert.strictEqual(full.pet.fun, 75);
const played = Pet.act(p, 'play', hatched).pet;
assert.deepStrictEqual([played.fun, played.energy, played.food], [100, 70, 75]);
assert.strictEqual(Pet.act(Object.assign({}, p, { energy: 10 }), 'play', hatched).said, 'Too sleepy to play…');

// Moods and growth.
assert.strictEqual(Pet.mood({ food: 70, fun: 90, energy: 61 }), 'happy');
assert.strictEqual(Pet.mood({ food: 70, fun: 30, energy: 61 }), 'okay');
assert.strictEqual(Pet.stage(p, born + 2 * Pet.DAY), 'kid');
assert.strictEqual(Pet.stage(p, born + 4 * Pet.DAY), 'grown');
assert.strictEqual(Pet.age(p, born + 4 * Pet.DAY + 5), '4 days old');

// Saved data is validated; anything odd starts a fresh pet.
assert.deepStrictEqual(Pet.load(JSON.stringify(q), hatched + 95 * H), Object.assign({ dead: false }, q));
assert.strictEqual(Pet.load('nope', 5).born, 5);
assert.strictEqual(Pet.load(JSON.stringify({ born: 1, last: 1, food: 'x', fun: 1, energy: 1 }), 5).born, 5);
assert.strictEqual(Pet.load(JSON.stringify({ born: 99, last: 99, food: 1, fun: 1, energy: 1 }), 5).born, 5, 'born in the future');
assert.strictEqual(Pet.load(JSON.stringify({ born: 1, last: 1, food: 500, fun: -3, energy: 1 }), 5).food, 100, 'clamped');

console.log('tamagotchi tests passed');
