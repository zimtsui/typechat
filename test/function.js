import assert from 'node:assert/strict';
import test from 'node:test';
import { Function } from '../build/function.js';
import { Message } from '../build/engine/message.js';
import { Text } from '../build/text.js';


test('Function call stores id, name and typed args', () => {
    const call = Function.Call.of({
        id: 'call_1',
        name: 'echo',
        args: { text: 'hello' },
    });

    assert.strictEqual(call.id, 'call_1');
    assert.strictEqual(call.name, 'echo');
    assert.deepStrictEqual(call.args, { text: 'hello' });
});

test('Function successful response is collected from user message', () => {
    const response = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [new Text('done')],
    });
    const userMessage = new Message.Input([response]);

    assert.deepStrictEqual(userMessage.getFunctionResponses(), [response]);
    assert.strictEqual(userMessage.getOnlyFunctionResponse(), response);
});

test('Function failed response preserves error text', () => {
    const response = Function.Response.Failed.of({
        id: 'call_1',
        name: 'echo',
        error: 'failed',
    });

    assert.strictEqual(response instanceof Function.Response, true);
    assert.strictEqual(response.error, 'failed');
});
