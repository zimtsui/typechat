import test from 'ava';
import { isRepeating } from '../build/repetition.js';

const diverse256 = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i + 1)).join('');

test('isRepeating ignores trailing partial block', t => {
    t.false(isRepeating('a'.repeat(255)));
    t.false(isRepeating('0123456789abcdef'.repeat(16) + 'a'.repeat(255), 256, .01));
});

test('isRepeating detects repeating full block', t => {
    t.true(isRepeating('a'.repeat(256), 256, .01));
    t.true(isRepeating('ab'.repeat(128), 256, .02));
});

test('isRepeating rejects diverse full block', t => {
    t.false(isRepeating('0123456789abcdef'.repeat(16), 256, .12));
    t.false(isRepeating('0123456789abcdef'.repeat(16), 256, .1));
});

test('isRepeating uses default len and threshold', t => {
    t.true(isRepeating('a'.repeat(256)));
    t.false(isRepeating(diverse256));
});

test('isRepeating checks each full block independently', t => {
    t.true(isRepeating('0123456789abcdef'.repeat(16) + 'a'.repeat(256), 256, .01));
    t.false(isRepeating('0123456789abcdef'.repeat(16) + 'a'.repeat(255), 256, .01));
});

test('isRepeating accepts custom block length', t => {
    t.true(isRepeating('a'.repeat(16), 16, .12));
    t.false(isRepeating('0123456789abcdef', 16, .1));
});
