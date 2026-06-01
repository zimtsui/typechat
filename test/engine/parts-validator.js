import test from 'ava';
import { Engine } from '../../build/engine.js';
import { PartsValidator } from '../../build/engine/parts-validator.js';
import { Message } from '../../build/engine/message.js';


test('Parts validator rejects empty output messages', t => {
    const validator = new PartsValidator();
    const outputMessage = new Message.Output([]);

    t.throws(() => validator.validate(outputMessage), {
        instanceOf: Engine.Exceptions.InferenceError,
        message: 'Empty message.',
    });
});
