import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { isRepeating } from '../build/repetition.js';

const deepseek = fs.readFileSync(new URL('./repetition/deepseek.txt', import.meta.url), 'utf8');
const synthetic = fs.readFileSync(new URL('./repetition/synthetic.txt', import.meta.url), 'utf8');
const diverse = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i + 1)).join('');

test('isRepeating detects strong literal repetition', () => {
    assert.strictEqual(isRepeating('a'.repeat(1024)), true);
    assert.strictEqual(isRepeating('ab'.repeat(512)), true);
});

test('isRepeating rejects diverse text', () => {
    assert.strictEqual(isRepeating(diverse), false);
    assert.strictEqual(isRepeating('0123456789abcdef'.repeat(16)), false);
});

test('isRepeating requires sufficiently long text', () => {
    assert.strictEqual(isRepeating('a'.repeat(1023)), false);
    assert.strictEqual(isRepeating('ab'.repeat(128)), false);
});

test('isRepeating uses default threshold', () => {
    assert.strictEqual(isRepeating(deepseek), true);
    assert.strictEqual(isRepeating(synthetic), true);
});
