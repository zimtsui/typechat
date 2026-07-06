import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../../build/engine.js';
import { Function } from '../../build/function.js';
import { Message } from '../../build/engine/message.js';
import { Text } from '../../build/text.js';


test('Message validator rejects empty output messages', () => {
    const validator = new Engine.MessageValidator();
    const outputMessage = new Message.Output([]);

    assert.throws(() => validator.validateOutputMessage(outputMessage), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Empty message.');
});

test('Message validator rejects invalid input message part order', () => {
    const validator = new Engine.MessageValidator();
    const response = Function.Response.Successful.of({
        id: 'call_1',
        name: 'noop',
        parts: [new Text('ok')],
    });

    assert.doesNotThrow(() => validator.validateInputMessage(new Message.Input([
        response,
        new Text('next'),
    ])));
    assert.throws(() => validator.validateInputMessage(new Message.Input([
        new Text('next'),
        response,
    ])));
});
