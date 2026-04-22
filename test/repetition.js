import test from 'ava';
import fs from 'node:fs';
import { isRepeating } from '../build/repetition.js';

const deepseek = fs.readFileSync(new URL('./repetition/deepseek.txt', import.meta.url), 'utf8');
const synthetic = fs.readFileSync(new URL('./repetition/synthetic.txt', import.meta.url), 'utf8');
const diverse = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i + 1)).join('');

test('isRepeating detects strong literal repetition', t => {
    t.true(isRepeating('a'.repeat(1024)));
    t.true(isRepeating('ab'.repeat(512)));
});

test('isRepeating rejects diverse text', t => {
    t.false(isRepeating(diverse));
    t.false(isRepeating('0123456789abcdef'.repeat(16)));
});

test('isRepeating requires sufficiently long text', t => {
    t.false(isRepeating('a'.repeat(1023)));
    t.false(isRepeating('ab'.repeat(128)));
});

test('isRepeating uses default threshold', t => {
    t.true(isRepeating(deepseek));
    t.true(isRepeating(synthetic));
});
