import test from 'ava';
import { Function } from '../../build/function.js';
import { Message } from '../../build/engine/message.js';
import { Text } from '../../build/text.js';


test('Text paragraph helper trims trailing whitespace and appends paragraph break', t => {
    t.is(Text.paragraph('hello  ').raw, 'hello\n\n');
});

test('Developer message requires only text parts for getOnlyTextParts', t => {
    const text = new Text('hello');
    const valid = new Message.Developer([text]);
    const invalid = new Message.Developer([text, { kind: 'unknown' }]);

    t.deepEqual(valid.getOnlyTextParts(), [text]);
    t.throws(() => invalid.getOnlyTextParts());
});

test('Output message separates text and function calls', t => {
    const text = new Text('chat');
    const text2 = new Text('more');
    const call = Function.Call.of({
        id: 'call_1',
        name: 'noop',
        args: {},
    });
    const message = new Message.Output([text, text2, call]);

    t.false(message.allTextParts());
    t.is(message.joinText(), 'chatmore');
    t.deepEqual(message.getFunctionCalls(), [call]);
    t.is(message.getOnlyFunctionCall(), call);
});

test('Output message rejects getOnly helpers unless exactly one function call exists', t => {
    const empty = new Message.Output([]);
    const twoCalls = new Message.Output([
        Function.Call.of({ id: 'call_1', name: 'noop', args: {} }),
        Function.Call.of({ id: 'call_2', name: 'noop', args: {} }),
    ]);

    t.throws(() => empty.getOnlyFunctionCall());
    t.throws(() => twoCalls.getOnlyFunctionCall());
});
