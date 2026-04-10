import test from 'ava';
import { isRepeating } from '../build/repetition.js';


test('isRepeating detects contiguous repeated substrings', t => {
    t.true(isRepeating('abcabcabc', 3, 3));
    t.true(isRepeating('xyzxyzxyzxyz', 3, 4));
});

test('isRepeating accepts repeated substrings longer than the minimum length', t => {
    t.true(isRepeating('ababab', 1, 3));
    t.true(isRepeating('hellohellohello', 2, 3));
});

test('isRepeating rejects separated duplicate substrings', t => {
    t.false(isRepeating('abcxabcxabc', 3, 3));
});

test('isRepeating rejects strings without enough consecutive repeats', t => {
    t.false(isRepeating('abcdabce', 3, 2));
    t.false(isRepeating('aaaaab', 2, 3));
});

test('isRepeating handles degenerate thresholds', t => {
    t.true(isRepeating('abc', 3, 1));
    t.true(isRepeating('aaaaaa', 1, 4));
    t.false(isRepeating('abc', 2, 2));
    t.false(isRepeating('abc', 4, 2));
    t.false(isRepeating('', 1, 2));
});
