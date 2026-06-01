import test from 'ava';
import { Engine } from '../../build/engine.js';
import { Function } from '../../build/function.js';
import { Message } from '../../build/engine/message.js';
import { Text } from '../../build/text.js';


test('Message validator rejects empty output messages', t => {
    const validator = new Engine.MessageValidator();
    const outputMessage = new Message.Output([]);

    t.throws(() => validator.validateOutputMessage(outputMessage), {
        instanceOf: Engine.Exceptions.InferenceError,
        message: 'Empty message.',
    });
});

test('Message validator rejects invalid input message part order', t => {
    const validator = new Engine.MessageValidator();
    const response = Function.Response.Successful.of({
        id: 'call_1',
        name: 'noop',
        parts: [new Text('ok')],
    });

    t.notThrows(() => validator.validateInputMessage(new Message.Input([
        response,
        new Text('next'),
    ])));
    t.throws(() => validator.validateInputMessage(new Message.Input([
        new Text('next'),
        response,
    ])));
});
