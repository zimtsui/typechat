import test from 'ava';
import { Function } from '../../build/function.js';
import { RoleMessage } from '../../build/engine/message.js';


test('RoleMessage paragraph helpers trim trailing whitespace and append paragraph break', t => {
    t.is(RoleMessage.Developer.Part.Text.paragraph('hello  ').text, 'hello\n\n');
    t.is(RoleMessage.Ai.Part.Text.paragraph('hello  ').text, 'hello\n\n');
    t.is(RoleMessage.User.Part.Text.paragraph('hello  ').text, 'hello\n\n');
});

test('Developer message requires only text parts for getOnlyTextParts', t => {
    const text = new RoleMessage.Developer.Part.Text('hello');
    const valid = new RoleMessage.Developer([text]);
    const invalid = new RoleMessage.Developer([text, { kind: 'unknown' }]);

    t.deepEqual(valid.getOnlyTextParts(), [text]);
    t.throws(() => invalid.getOnlyTextParts());
});

test('AI message separates text and function calls', t => {
    const text = new RoleMessage.Ai.Part.Text('chat');
    const text2 = new RoleMessage.Ai.Part.Text('more');
    const call = Function.Call.of({
        id: 'call_1',
        name: 'noop',
        args: {},
    });
    const message = new RoleMessage.Ai([text, text2, call]);

    t.false(message.allText());
    t.is(message.getText(), 'chatmore');
    t.deepEqual(message.getFunctionCalls(), [call]);
    t.is(message.getOnlyFunctionCall(), call);
});

test('AI message rejects getOnly helpers unless exactly one item exists', t => {
    const empty = new RoleMessage.Ai([]);
    const twoCalls = new RoleMessage.Ai([
        Function.Call.of({ id: 'call_1', name: 'noop', args: {} }),
        Function.Call.of({ id: 'call_2', name: 'noop', args: {} }),
    ]);

    t.throws(() => empty.getOnlyFunctionCall());
    t.throws(() => twoCalls.getOnlyFunctionCall());
});
