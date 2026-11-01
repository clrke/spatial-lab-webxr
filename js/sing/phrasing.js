// Words sung (or shown) together: an article or determiner plus its adjectives stay
// on the same beat as their noun, never split by a breath, a pulse or a line break.
//
// Ported from musical-bots web/src/mv/voice/text/chunks.js (2026-11-01), minus its
// 276 KB vendored compromise tagger: closed word sets plus suffix and position
// repairs tuned for short instructional lines. Pure module: no DOM, no three.js.
//
// Bind strengths (same values as the original):
//   LEAD 1.0   article/determiner into its noun phrase      "the | FIRE", "my old friend"
//   LEAN 0.7   preposition into its object, "to" into verb  "by the fire", "to win"
//   MOD  0.6   modifier into its head: adjectives, numbers, "giant cake", "two eggs",
//              nouns before a noun                          "chalk start line"
//   DEG  0.5   degree adverb into its adjective             "so bright", "very tall"
//   AUX  0.4   auxiliary / negation into its verb           "can't stop", "will go"
// A bind never crosses punctuation.
//
// Known deviations from the original: unknown content words default to nouns (the
// original asks compromise), so a missed verb over-binds rather than splits a noun
// phrase; the crew-name rules are dropped (musical-bots cast); contractions other
// than n't / 's / cannot are left whole.

export const LEAD = 1.0;
export const LEAN = 0.7;
export const MOD = 0.6;
export const DEG = 0.5;
export const AUX = 0.4;

export const ARTICLES = new Set(['a', 'an', 'the']);
/** Determiners (possessives, demonstratives, quantifiers). 'that' handled in prelim. */
const DETERMINERS = new Set(['my', 'your', 'our', 'their', 'his', 'her', 'its', 'this', 'these', 'those',
  'every', 'each', 'some', 'no', 'any', 'another', 'whose', 'all', 'both', 'few', 'many', 'much',
  'more', 'most', 'several', 'such']);
/** "'s" that is "is" / "us", not a possessive. */
const NOT_POSSESSIVE = new Set(["it's", "that's", "he's", "she's", "there's", "here's", "what's",
  "who's", "where's", "let's", "how's"]);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'us', 'them',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  'who', 'whom', 'which', 'what', 'whoever', 'whatever']);
const AUXILIARIES = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have',
  'had', 'having', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may',
  'might', 'must', 'ought']);
const PREPOSITIONS = new Set(['about', 'above', 'across', 'after', 'against', 'along', 'among',
  'around', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'by',
  'despite', 'down', 'during', 'except', 'for', 'from', 'in', 'inside', 'into', 'like', 'near',
  'of', 'off', 'on', 'onto', 'out', 'outside', 'over', 'past', 'round', 'through', 'throughout',
  'toward', 'towards', 'under', 'underneath', 'until', 'up', 'upon', 'with', 'within', 'without']);
const CONJUNCTIONS = new Set(['and', 'but', 'or', 'nor', 'yet', 'so', 'while', 'as', 'when', 'if',
  'then', 'than', 'because', 'although', 'though', 'unless', 'since', 'where', 'whereas',
  'wherever']);
const INTERJECTIONS = new Set(['yes', 'oh', 'ah', 'hey', 'hi', 'hello', 'wow', 'oops',
  'ouch', 'uh', 'um', 'yay', 'yikes']);
/** Singular words ending in "s" (never plural subjects): math, mass nouns, -ics fields. */
const SINGULAR_S = new Set(['cos', 'news', 'lens', 'means', 'series', 'species', 'physics',
  'mathematics']);
const NUMBERS = new Set(['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety', 'hundred', 'thousand', 'million', 'half', 'quarter', 'double', 'single', 'once', 'twice']);
const ADVERBS = new Set(['tonight', 'today', 'now', 'again', 'here', 'there']);
/** Common adjectives; anything else in adjective position is caught by repair R-c.
 *  Colors are deliberately absent: they double as nouns and names ("Black struts"),
 *  and the positional (R-c) and predicative (R-d) repairs still catch adjectival uses. */
const ADJECTIVES = new Set(['big', 'small', 'little', 'large', 'great', 'good', 'better', 'high',
  'higher', 'highest', 'low', 'lower', 'lowest', 'fast', 'faster', 'fastest', 'slow', 'slower',
  'slowest', 'new', 'old', 'older', 'oldest', 'young', 'younger', 'long', 'longer', 'short', 'tall',
  'taller', 'wide', 'narrow', 'bright', 'brighter', 'brightest', 'dark', 'darker', 'glowing',
  'golden', 'hot', 'cold', 'warm', 'cool', 'loud', 'louder', 'soft', 'softer', 'hard', 'easy',
  'easier', 'simple', 'simpler', 'right', 'left', 'first', 'last', 'next', 'same', 'whole', 'full',
  'empty', 'tiny', 'huge', 'giant', 'main', 'own', 'other', 'deep', 'shallow']);
/** Base-form verbs (imperatives and common lyric verbs); -s forms come from repair. */
const VERBS = new Set(['pinch', 'spin', 'drag', 'turn', 'throw', 'match', 'make', 'try', 'let', 'go',
  'pull', 'stretch', 'build', 'slide', 'launch', 'drop', 'grab', 'watch', 'read', 'check', 'hit',
  'see', 'sit', 'put', 'press', 'tap', 'poke', 'wave', 'hold', 'release', 'stop', 'start', 'reset',
  'enter', 'open', 'close', 'draw', 'move', 'set', 'add', 'keep', 'take', 'give', 'find', 'use',
  'pick', 'dance', 'sing', 'hum', 'play', 'say', 'tell', 'look', 'listen', 'hear', 'feel', 'run',
  'walk', 'jump', 'fly', 'float', 'fall', 'rise', 'grow', 'shine', 'glow', 'flow', 'blow', 'cook',
  'bake', 'paint', 'roll', 'bounce', 'flutter', 'wobble', 'need', 'want', 'love', 'know', 'think',
  'come', 'get', 'leave', 'keep', 'sleep', 'dream', 'strut', 'alternate', 'stay']);
/** Verb-lexicon words that are also common singular nouns ("a start", "a dance"). */
const DUAL_NOUNS = new Set(['start', 'end', 'play', 'match', 'check', 'spin', 'dance', 'call',
  'run', 'walk', 'jump', 'fall', 'rise', 'rest', 'stop', 'turn', 'move', 'set', 'draw', 'dream',
  'hum', 'sing', 'love', 'need']);
const NOMINAL = new Set(['adj', 'num', 'noun']);
const CLAUSE = new Set(['that', 'if', 'while', 'as', 'when', 'so', 'but', 'and', 'then']);
const ADVERBIAL = new Set(['tonight', 'today', 'there', 'here', 'best', 'less', 'none', 'up', 'out',
  'now', 'again']);
const DEGREE = new Set(['real', 'way', 'brand', 'half', 'such', 'so', 'too', 'very', 'just', 'all',
  'pretty', 'still']);
const BE = new Set(['am', 'is', 'are', 'was', 'were', 'be']);
const ADJ_SUFFIX = /(ful|less|ous|ive|able|ible)$/;
const NTCONTRACTIONS = new Map([["can't", 'can'], ["won't", 'will'], ["shan't", 'shall'],
  ["ain't", 'is'], ["don't", 'do'], ["doesn't", 'do'], ["didn't", 'do'], ["couldn't", 'could'],
  ["wouldn't", 'would'], ["shouldn't", 'should'], ["mustn't", 'must'], ["isn't", 'is'],
  ["aren't", 'are'], ["wasn't", 'was'], ["weren't", 'were'], ["hasn't", 'has'], ["haven't", 'have'],
  ["hadn't", 'had'], ["needn't", 'need'], ["mightn't", 'might']]);

const lettersOf = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}']/gu, '')
  .replace(/^'+|'+$/g, '');
const clean = (s) => String(s ?? '').replace(/[’‘]/g, "'");

/** Preliminary part of speech from word sets and suffixes (replaces compromise). */
function prelim(raw) {
  const word = clean(raw);
  if (/^\d/.test(word.trim())) return 'num';
  const w = lettersOf(word);
  if (!w) return 'other';
  if (NOT_POSSESSIVE.has(w)) return 'pron';
  if (ARTICLES.has(w)) return 'det';
  if (w === 'to') return 'to';
  if (DETERMINERS.has(w) || w === 'that') return 'det';
  if (PRONOUNS.has(w)) return 'pron';
  if (AUXILIARIES.has(w)) return 'aux';
  if (PREPOSITIONS.has(w)) return 'prep';
  if (CONJUNCTIONS.has(w)) return 'conj';
  if (NUMBERS.has(w)) return 'num';
  if (INTERJECTIONS.has(w)) return 'other';
  if (w === 'not' || w === 'never') return 'adv';
  if (ADVERBS.has(w)) return 'adv';
  if (ADJECTIVES.has(w)) return 'adj';
  if (VERBS.has(w)) return 'verb';
  if (/ly$/.test(w) && w.length > 4) return 'adv';
  if (/(ing|ed)$/.test(w) && w.length > 4) return 'verb';
  return 'noun'; // unknown content words default nominal, so modifiers bind
}

/**
 * Fixes the preliminary tags' usual slips on short lines (adapted from the original
 * repair(): compromise-tag guards become suffix tests).
 */
function repair(pos, words) {
  const n = pos.length;
  const lw = (j) => lettersOf(clean(words[j]?.text));
  const same = (j, k) => words[j] && words[k] && words[j].phrase === words[k].phrase;
  const sForm = (j) => /[^s']s$/i.test(lw(j)) && !SINGULAR_S.has(lw(j));
  const nominal = (p) => NOMINAL.has(p);
  const verbBefore = (i) => {
    for (let j = i - 1; j >= 0 && same(j, i); j--) {
      if (pos[j] === 'verb' || pos[j] === 'aux') return true;
      if (pos[j] === 'conj' || CLAUSE.has(lw(j))) return false;
    }
    return false;
  };

  // A possessive ("Navy's") leads into its noun phrase as a modifier; "her" before a
  // noun is a determiner.
  words.forEach((w, i) => {
    if (/'s$/i.test(clean(w.text)) && !NOT_POSSESSIVE.has(lw(i)) && pos[i] !== 'pron') pos[i] = 'noun';
  });
  words.forEach((w, i) => {
    if (lw(i) === 'her' && pos[i + 1] === 'noun' && same(i, i + 1)) pos[i] = 'det';
  });
  // R-a1: an -s "noun" after a noun/adjective, with an object after it, is the verb
  // ("Black struts up", "Copper dreams of").
  for (let i = n - 2; i >= 1; i--) {
    if (pos[i] !== 'noun' || !sForm(i) || !same(i, i + 1)) continue;
    if (!['noun', 'adj'].includes(pos[i - 1]) || !same(i - 1, i)) continue;
    const nx = pos[i + 1];
    if (nx === 'det' || nx === 'prep' || nx === 'pron' || nx === 'to' || nx === 'verb'
      || (nx === 'conj' && pos[i + 2] === 'verb')) pos[i] = 'verb';
  }
  // R-a2 (new): an -s word after a pronoun subject is its verb ("it moves").
  for (let i = 1; i < n; i++) {
    if (pos[i] === 'noun' && sForm(i) && pos[i - 1] === 'pron' && same(i - 1, i)) pos[i] = 'verb';
  }
  // R-a3: "that / each / this" + -s word + object: a pronoun subject and its verb.
  for (let i = 0; i < n - 1; i++) {
    if (!['that', 'each', 'this'].includes(lw(i)) || pos[i] !== 'det' || !same(i, i + 1)) continue;
    if (!sForm(i + 1)) continue;
    if (!same(i + 1, i + 2) || ['det', 'pron', 'prep'].includes(pos[i + 2])) {
      pos[i] = 'pron';
      pos[i + 1] = 'verb';
    }
  }
  // R-a4: a clause with no verb sings its last plural "noun" as one
  // ("The giant cake wobbles").
  const byPhrase = new Map();
  words.forEach((w, i) => {
    if (!byPhrase.has(w.phrase)) byPhrase.set(w.phrase, []);
    byPhrase.get(w.phrase).push(i);
  });
  for (const idx of byPhrase.values()) {
    if (idx.some((i) => pos[i] === 'verb' || pos[i] === 'aux')) continue;
    const last = idx[idx.length - 1];
    if (idx.length >= 3 && pos[last] === 'noun' && sForm(last)
      && pos[last - 1] === 'noun' && same(last - 1, last)) pos[last] = 'verb';
  }
  // R-a5: a bare "noun" after a plural subject is its verb ("Pages flutter").
  for (let i = 1; i < n; i++) {
    if (pos[i] !== 'noun' || sForm(i) || pos[i - 1] !== 'noun' || !sForm(i - 1)) continue;
    if (!same(i - 1, i) || /'s$/.test(clean(words[i - 1].text))) continue;
    const nx = same(i, i + 1) ? pos[i + 1] : 'END';
    if (nx === 'END' || ['adv', 'adj', 'prep', 'conj'].includes(nx)) pos[i] = 'verb';
  }
  // R-a6: an -s "noun" after a noun/adjective, clause-initial, followed by no object,
  // is the verb ("Cake wobbles tonight").
  for (let i = 1; i < n; i++) {
    if (pos[i] !== 'noun' || !sForm(i) || verbBefore(i)) continue;
    const nx = same(i, i + 1) ? pos[i + 1] : 'END';
    const tail = ['adv', 'adj', 'END', 'conj'].includes(nx)
      || ['past', 'round', 'like', 'than', 'as', 'but', 'tonight', 'here', 'there', 'now', 'again']
        .includes(lw(i + 1));
    if (!tail || lw(i + 1) === lw(i - 1)) continue;
    if (pos[i - 1] === 'noun' && same(i - 1, i)) pos[i] = 'verb';
    else if (pos[i - 1] === 'adj' && same(i - 1, i)
      && (i < 2 || !['det', 'adj', 'num'].includes(pos[i - 2])) && nx !== 'adj' && nx !== 'END') {
      pos[i] = 'verb';
    }
  }
  // R-b: a "verb" (or -ly adverb) right after a determiner/adjective in a noun phrase
  // is the phrase's adjective or noun ("Navy's tiny boat", "a glowing point").
  for (let i = 1; i < n; i++) {
    if (!['verb', 'adv'].includes(pos[i]) || !same(i - 1, i)) continue;
    const w = lw(i);
    if (pos[i] === 'adv' && !/ly$/.test(w)) continue;
    const npPos = pos[i - 1] === 'det'
      || (pos[i - 1] === 'adj'
        && (i < 2 || ['det', 'adj', 'num', 'adv'].includes(pos[i - 2])
          || /'s$/i.test(clean(words[i - 2].text))) && (i < 2 || same(i - 2, i)));
    if (!npPos) continue;
    const nextNominal = same(i, i + 1) && nominal(pos[i + 1]);
    if (ADJECTIVES.has(w) || ADJ_SUFFIX.test(w) || /ly$/.test(w)
      || ((/ing$/.test(w) || /ed$/.test(w)) && nextNominal)) pos[i] = 'adj';
    else pos[i] = 'noun';
  }
  // R-c (new): an unknown word between a determiner/adjective and a nominal head is an
  // adjective ("the big dog"). Never fires on recognized verbs.
  for (let i = 1; i < n - 1; i++) {
    if (pos[i] !== 'noun' || VERBS.has(lw(i))) continue;
    if (!['det', 'adj', 'adv', 'num'].includes(pos[i - 1]) || !same(i - 1, i)) continue;
    if (!nominal(pos[i + 1]) || !same(i, i + 1)) continue;
    if (/[^s']s$/i.test(lw(i))) continue; // plurals stay nouns ("the eggs hatch")
    pos[i] = 'adj';
  }
  // R-d (new): an unknown word after "is/are/..." is a predicative adjective
  // ("the chord is mellow"); plurals and capitals stay nouns.
  for (let i = 1; i < n; i++) {
    if (pos[i] !== 'noun' || VERBS.has(lw(i))) continue;
    if (pos[i - 1] !== 'aux' || !BE.has(lw(i - 1)) || !same(i - 1, i)) continue;
    if (same(i, i + 1) && !['prep', 'conj'].includes(pos[i + 1])) continue;
    if (/^[A-Z]/.test(clean(words[i].text))) continue;
    if (/[^s']s$/i.test(lw(i))) continue;
    pos[i] = 'adj';
  }
  // R-e (new): a noun-dual verb between two singular nouns is the compound's middle
  // ("chalk start line"). After a plural subject it stays the clause verb
  // ("plants start growing").
  for (let i = 1; i < n - 1; i++) {
    if (pos[i] !== 'verb' || !DUAL_NOUNS.has(lw(i))) continue;
    if (pos[i - 1] !== 'noun' || pos[i + 1] !== 'noun') continue;
    if (!same(i - 1, i) || !same(i, i + 1)) continue;
    if (sForm(i - 1) && !/'s$/i.test(clean(words[i - 1].text))) continue;
    pos[i] = 'noun';
  }
}

/** The bind of word b to word a before it (parts of speech pa, pb). */
function bindOf(pa, pb, wa, wb, headAhead) {
  const a = lettersOf(clean(wa));
  const b = lettersOf(clean(wb));
  if (a === 'all' && pb === 'det') return LEAD; // "all the way", "all our might"
  if (a === "let's" && pb === 'verb') return AUX;
  if (a === 'thank' && b === 'you') return AUX;
  if ((a === 'not' || a === 'never') && pb !== 'conj') return AUX; // negation
  if (pa === 'det') return pb === 'conj' || pb === 'prep' || pb === 'pron' ? 0 : LEAD;
  if (ADVERBIAL.has(b) && pb !== 'det') return 0; // an adverb-like word: "tray tonight"
  if (pa === 'prep') return NOMINAL.has(pb) || pb === 'det' || pb === 'pron' ? LEAN : 0;
  if (pa === 'to') {
    return pb === 'verb' || pb === 'adv' || NOMINAL.has(pb) || pb === 'det' || pb === 'pron' ? LEAN : 0;
  }
  if (pa === 'aux') return pb === 'verb' ? AUX : 0;
  if (DEGREE.has(a) && (pb === 'adj' || (pb === 'adv' && a !== 'all'))) return DEG;
  if (pa === 'adv') return pb === 'adj' && !/ly$/.test(a) ? DEG : 0;
  if (pa === 'num' && (pb === 'noun' || pb === 'adj')) return MOD;
  if ((pa === 'adj' || pa === 'noun') && (pb === 'noun' || (pb === 'adj' && headAhead))) return MOD;
  return 0;
}

/** Punctuation that ends a phrase (a bind never crosses it). Hyphens split words only. */
const PHRASE_SPLIT = /[,;:.!?=()[\]{}"“”…—–/+\*%<>°·×÷&|\\]/;
const WORD_RE = /\d+\.\d+|[\p{L}\d]+(?:['’][\p{L}\d]+)*/gu;

/** Split text into words (letter runs, in order) with phrase indexes. */
function tokenize(text) {
  const words = [];
  let phrase = 0;
  let end = 0;
  for (const m of String(text ?? '').matchAll(WORD_RE)) {
    const gap = String(text ?? '').slice(end, m.index);
    if (PHRASE_SPLIT.test(gap)) phrase += 1;
    end = m.index + m[0].length;
    const norm = clean(m[0]).toLowerCase();
    if (NTCONTRACTIONS.has(norm)) {
      words.push({ text: NTCONTRACTIONS.get(norm), charStart: m.index, charEnd: end, phrase });
      words.push({ text: 'not', charStart: m.index, charEnd: end, phrase });
    } else if (/n't$/.test(norm)) {
      words.push({ text: m[0].slice(0, -3), charStart: m.index, charEnd: end, phrase });
      words.push({ text: 'not', charStart: m.index, charEnd: end, phrase });
    } else if (norm === 'cannot') {
      words.push({ text: 'can', charStart: m.index, charEnd: end, phrase });
      words.push({ text: 'not', charStart: m.index, charEnd: end, phrase });
    } else {
      words.push({ text: m[0], charStart: m.index, charEnd: end, phrase });
    }
  }
  return words;
}

const cache = new Map();

/**
 * Parts of speech and binds of a line's words.
 * @param {string} text the line
 * @returns {Array<{text:string, pos:string, bind:number, article:boolean}>} per word: its
 *   text, part of speech, bind to the word before it (0 for the first word and across
 *   punctuation), and whether it is an article
 */
export function wordChunks(text) {
  const key = String(text ?? '');
  const hit = cache.get(key);
  if (hit) return hit;
  const words = tokenize(key);
  const pos = words.map((w) => prelim(w.text));
  repair(pos, words);
  const out = words.map((w, i) => {
    let bind = 0;
    if (i > 0 && words[i - 1].phrase === w.phrase) {
      let headAhead = false;
      for (let k = i; k < words.length && words[k].phrase === w.phrase && NOMINAL.has(pos[k]); k++) {
        if (pos[k] === 'noun') {
          headAhead = true;
          break;
        }
      }
      bind = bindOf(pos[i - 1], pos[i], words[i - 1].text, w.text, headAhead);
      // "side by side", "one by one"
      if (lettersOf(clean(w.text)) === 'by'
        && lettersOf(clean(words[i + 1]?.text)) === lettersOf(clean(words[i - 1].text))) bind = LEAN;
    }
    return { text: w.text, pos: pos[i], bind, article: ARTICLES.has(lettersOf(clean(w.text))) };
  });
  // A hook repeated in the line sings its pair the same way ("School garden, school garden").
  for (let i = 1; i < out.length; i++) {
    for (let j = 1; j < i - 1; j++) {
      if (out[j].bind > 0 && lettersOf(clean(words[j].text)) === lettersOf(clean(words[i].text))
        && lettersOf(clean(words[j - 1].text)) === lettersOf(clean(words[i - 1].text))
        && words[i].phrase === words[i - 1].phrase) {
        out[i].bind = out[j].bind;
        out[i].pos = out[j].pos;
        out[i - 1].pos = out[j - 1].pos;
      }
    }
  }
  if (cache.size > 4000) cache.clear();
  cache.set(key, out);
  return out;
}

/**
 * The groups of a line sung together: runs of words joined by a bind, as word index
 * lists (a free word stands alone).
 * @param {Array<{bind:number}>} chunks wordChunks output
 * @returns {number[][]}
 */
export function groupsOf(chunks) {
  const out = [];
  chunks.forEach((c, i) => {
    if (i > 0 && c.bind > 0) out[out.length - 1].push(i);
    else out.push([i]);
  });
  return out;
}

/** The sung-together groups of a line as word-text lists. */
export function groupTexts(text) {
  const chunks = wordChunks(text);
  return groupsOf(chunks).map((g) => g.map((i) => chunks[i].text));
}

/**
 * Wrap a line so a sung-together group never splits across lines unless the group
 * alone is wider than maxWidth (then its words split as a last resort).
 * @param {string} text the line
 * @param {(s:string) => number} measure width of a string, same units as maxWidth
 * @param {number} maxWidth available width
 * @returns {string[]} wrapped lines
 */
export function wrapLines(text, measure, maxWidth) {
  const chunks = wordChunks(text);
  if (!chunks.length) return [text];
  const words = chunks.map((c) => c.text);
  const widthOf = (idxs) => measure(idxs.map((i) => words[i]).join(' '));
  const units = [];
  for (const g of groupsOf(chunks)) {
    if (widthOf(g) <= maxWidth || g.length < 2) {
      units.push(g);
      continue;
    }
    let wcur = [];
    for (const i of g) {
      if (wcur.length && widthOf([...wcur, i]) > maxWidth) {
        units.push(wcur);
        wcur = [];
      }
      wcur.push(i);
    }
    if (wcur.length) units.push(wcur);
  }
  const lines = [];
  let cur = [];
  for (const u of units) {
    if (cur.length && widthOf([...cur, ...u]) <= maxWidth) cur.push(...u);
    else {
      if (cur.length) lines.push(cur);
      cur = [...u];
    }
  }
  if (cur.length) lines.push(cur);
  return lines.map((idxs) => idxs.map((i) => words[i]).join(' '));
}

/**
 * How many opening words sing as pickups before the downbeat: a line opening on at
 * most two weak words (article, determiner, preposition) before a bound content word
 * ("The water…" sings "The" as a pickup). Word-level analogue of the original
 * autoPickup(), which works on stressed syllables.
 * @param {string} text the line
 * @returns {number} 0, 1 or 2
 */
export function pickupCount(text) {
  const chunks = wordChunks(text);
  let n = 0;
  while (n < chunks.length && n < 2
    && (chunks[n].pos === 'det' || chunks[n].pos === 'prep' || chunks[n].pos === 'to')) n += 1;
  if (n === 0 || n >= chunks.length) return 0;
  return chunks[n].bind >= LEAN ? n : 0;
}
