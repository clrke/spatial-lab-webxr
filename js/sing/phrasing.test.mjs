// Tests for the sung-together phrasing rule (js/sing/phrasing.js).
// Run: npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUX, DEG, LEAD, LEAN, MOD, groupTexts, groupsOf, pickupCount, wordChunks, wrapLines,
} from './phrasing.js';

const binds = (text) => wordChunks(text).map((c) => c.bind);
const poses = (text) => wordChunks(text).map((c) => c.pos);

describe('articles and determiners bind into their noun phrase', () => {
  it('the giant cake wobbles', () => {
    assert.deepEqual(binds('The giant cake wobbles'), [0, LEAD, MOD, 0]);
    assert.deepEqual(poses('The giant cake wobbles'), ['det', 'adj', 'noun', 'verb']);
    assert.deepEqual(groupsOf(wordChunks('The giant cake wobbles')), [[0, 1, 2], [3]]);
  });

  it('the big dog stays one group', () => {
    assert.deepEqual(groupsOf(wordChunks('the big dog')), [[0, 1, 2]]);
  });

  it('a glowing point', () => {
    assert.deepEqual(binds('a glowing point'), [0, LEAD, MOD]);
    assert.deepEqual(groupTexts('a glowing point'), [['a', 'glowing', 'point']]);
  });

  it('my old friend', () => {
    assert.deepEqual(binds('my old friend'), [0, LEAD, MOD]);
  });

  it('all the way', () => {
    assert.deepEqual(binds('all the way'), [0, LEAD, LEAD]);
  });

  it('a bind never crosses punctuation', () => {
    assert.deepEqual(binds('School garden, school garden'), [0, MOD, 0, MOD]);
    assert.deepEqual(groupsOf(wordChunks('School garden, school garden')), [[0, 1], [2, 3]]);
  });
});

describe('other binds match musical-bots strengths', () => {
  it('preposition leans into its object', () => {
    assert.deepEqual(binds('by the fire'), [0, LEAN, LEAD]);
  });

  it('to leans into its verb', () => {
    assert.deepEqual(binds('to win'), [0, LEAN]);
  });

  it('auxiliary binds into its verb', () => {
    assert.deepEqual(binds('will go'), [0, AUX]);
  });

  it('negation binds into its verb', () => {
    assert.deepEqual(poses("can't stop"), ['aux', 'adv', 'verb']);
    assert.deepEqual(binds("can't stop"), [0, 0, AUX]);
  });

  it('degree adverb binds into its adjective', () => {
    assert.deepEqual(binds('so bright'), [0, DEG]);
  });

  it('noun compounds bind', () => {
    assert.deepEqual(binds('chalk start line'), [0, MOD, MOD]);
  });

  it('numbers bind into their head', () => {
    assert.deepEqual(binds('two eggs'), [0, MOD]);
  });

  it('colors classify by position, not by list', () => {
    assert.deepEqual(poses('the red balloon'), ['det', 'adj', 'noun']);
    assert.deepEqual(groupTexts('the red balloon'), [['the', 'red', 'balloon']]);
  });

  it('noun-dual verbs stay verbs after a plural subject', () => {
    assert.deepEqual(poses('plants start growing'), ['noun', 'verb', 'verb']);
    assert.deepEqual(binds('plants start growing'), [0, 0, 0]);
  });

  it('singular -s words are never plural subjects', () => {
    assert.deepEqual(poses('Make cos θ = 0'), ['verb', 'noun', 'noun', 'num']);
    assert.deepEqual(groupTexts('Make cos θ = 0'), [['Make'], ['cos', 'θ'], ['0']]);
  });

  it('decimals stay one token', () => {
    assert.deepEqual(groupTexts('Make sin θ = 0.5'), [['Make'], ['sin', 'θ'], ['0.5']]);
  });

  it('where breaks the noun phrase before it', () => {
    assert.deepEqual(groupTexts('Find a second angle where sin θ = 0.5'),
      [['Find'], ['a', 'second', 'angle'], ['where'], ['sin', 'θ'], ['0.5']]);
  });

  it('stay and alternate read as verbs', () => {
    assert.deepEqual(groupTexts('feet stay put'), [['feet'], ['stay'], ['put']]);
    assert.deepEqual(poses('March in place (alternate legs)'), ['noun', 'prep', 'noun', 'verb', 'noun']);
  });

  it('interjections stand free', () => {
    assert.deepEqual(poses('Oh, look'), ['other', 'verb']);
    assert.deepEqual(binds('Oh, look'), [0, 0]);
  });

  it('subject verbs stay free of their subject', () => {
    assert.deepEqual(poses('Black struts up'), ['noun', 'verb', 'prep']);
    assert.deepEqual(binds('Black struts up'), [0, 0, 0]);
    assert.deepEqual(poses('Let go while it moves')[4], 'verb');
    assert.deepEqual(poses('Music is circles'), ['noun', 'aux', 'noun']);
  });
});

describe("this repo's prompt lines keep their noun phrases together", () => {
  it('Pinch a glowing point and spin it', () => {
    assert.deepEqual(groupTexts('Pinch a glowing point and spin it'),
      [['Pinch'], ['a', 'glowing', 'point'], ['and'], ['spin'], ['it']]);
  });

  it('Now spin the other one', () => {
    assert.deepEqual(groupsOf(wordChunks('Now spin the other one')), [[0], [1], [2, 3], [4]]);
  });

  it('That shape is your chord', () => {
    assert.deepEqual(groupTexts('That shape is your chord'),
      [['That', 'shape'], ['is'], ['your', 'chord']]);
  });

  it('Faster spin = higher note', () => {
    assert.deepEqual(groupTexts('Faster spin = higher note'),
      [['Faster', 'spin'], ['higher', 'note']]);
  });

  it('LEFT leg (capture protocol)', () => {
    assert.deepEqual(groupTexts('LEFT leg'), [['LEFT', 'leg']]);
  });

  it('predicative adjectives classify', () => {
    assert.deepEqual(poses('The chord is mellow')[3], 'adj');
    assert.deepEqual(poses('Music is circles')[2], 'noun');
  });
});

describe('wrapLines never splits a sung-together group', () => {
  const chars = (s) => s.length;

  it('keeps a glowing point on one line', () => {
    assert.deepEqual(wrapLines('Pinch a glowing point and spin it', chars, 20),
      ['Pinch', 'a glowing point and', 'spin it']);
  });

  it('returns the line unchanged when it fits', () => {
    assert.deepEqual(wrapLines('the big dog', chars, 20), ['the big dog']);
  });

  it('splits an oversize group word by word as a last resort', () => {
    assert.deepEqual(wrapLines('the big dog', chars, 5), ['the', 'big', 'dog']);
  });

  it('empty text stays one empty line', () => {
    assert.deepEqual(wrapLines('', chars, 20), ['']);
  });

  it('keeps minus signs and spacing (readout line)', () => {
    assert.deepEqual(wrapLines('sin −1.00    cos 0.00    tan undefined', chars, 20),
      ['sin −1.00    cos', '0.00    tan', 'undefined']);
  });

  it('keeps trailing punctuation left, opening punctuation right', () => {
    assert.deepEqual(wrapLines('Hello, brave new world', chars, 12),
      ['Hello,', 'brave new', 'world']);
    assert.deepEqual(wrapLines('Leaving VR...', chars, 20), ['Leaving VR...']);
  });

  it('never splits a contraction across lines', () => {
    // The implicit "not" has no surface of its own: it rides with "can't".
    assert.deepEqual(wrapLines("I can't stop", chars, 8), ["I can't", 'stop']);
  });

  it('rebalances a stranded last unit', () => {
    assert.deepEqual(wrapLines('Find a second angle where sin θ = 0.5', chars, 31),
      ['Find a second angle where', 'sin θ = 0.5']);
  });
});

describe('pickupCount sings opening articles as pickups', () => {
  it('The water rises', () => {
    assert.equal(pickupCount('The water rises'), 1);
  });

  it('By the fire', () => {
    assert.equal(pickupCount('By the fire'), 2);
  });

  it('lines opening on a verb have no pickup', () => {
    assert.equal(pickupCount('Pinch a glowing point'), 0);
  });
});
