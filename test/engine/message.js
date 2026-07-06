import assert from 'node:assert/strict';
import test from 'node:test';
import { Function } from '../../build/function.js';
import { Message } from '../../build/engine/message.js';
import { Text } from '../../build/text.js';


test('Text paragraph helper trims trailing whitespace and appends paragraph break', () => {
    assert.strictEqual(Text.paragraph('hello  ').raw, 'hello\n\n');
});

test('Developer message requires only text parts for getOnlyTextParts', () => {
    const text = new Text('hello');
    const valid = new Message.Developer([text]);
    const invalid = new Message.Developer([text, { kind: 'unknown' }]);

    assert.deepStrictEqual(valid.getOnlyTextParts(), [text]);
    assert.throws(() => invalid.getOnlyTextParts());
});

test('Output message separates text and function calls', () => {
    const text = new Text('chat');
    const text2 = new Text('more');
    const call = Function.Call.of({
        id: 'call_1',
        name: 'noop',
        args: {},
    });
    const message = new Message.Output([text, text2, call]);

    assert.strictEqual(message.allTextParts(), false);
    assert.strictEqual(message.joinText(), 'chatmore');
    assert.deepStrictEqual(message.getFunctionCalls(), [call]);
    assert.strictEqual(message.getOnlyFunctionCall(), call);
});

test('Output message rejects getOnly helpers unless exactly one function call exists', () => {
    const empty = new Message.Output([]);
    const twoCalls = new Message.Output([
        Function.Call.of({ id: 'call_1', name: 'noop', args: {} }),
        Function.Call.of({ id: 'call_2', name: 'noop', args: {} }),
    ]);

    assert.throws(() => empty.getOnlyFunctionCall());
    assert.throws(() => twoCalls.getOnlyFunctionCall());
});
