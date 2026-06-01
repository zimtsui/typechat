import test from 'ava';
import { Throttle } from '../../build/throttle.js';
import { Engine } from '../../build/engine.js';
import { Function } from '../../build/function.js';
import * as XmlCodec from '../../build/xml.js';
import { Message } from '../../build/engine/message.js';
import { Text } from '../../build/text.js';
import { functionDeclarationMap } from '../helpers.js';


class FakeEngine extends Engine.Instance {
    constructor(responses, toolChoiceValidator, partsValidator) {
        super({
            throttle: new Throttle(Number.POSITIVE_INFINITY),
            endpointSpec: {
                name: 'Fake Engine',
                baseUrl: 'https://example.invalid/fake',
                apiKey: 'test-key',
                model: 'test-model',
                apiType: 'openai-responses',
                parallelToolCall: false,
            },
            functionDeclarationMap,
            inferenceRetry: 1,
        });
        this.responses = responses;
        this.toolChoiceValidator = toolChoiceValidator;
        this.partsValidator = partsValidator;
        this.transport = {
            fetch: async () => this.responses.shift(),
        };
    }

    clone() {
        const engine = new FakeEngine(this.responses, this.toolChoiceValidator, this.partsValidator);
        engine.middlewaresStateless = [...this.middlewaresStateless];
        engine.middlewaresStateful = [...this.middlewaresStateful];
        return engine;
    }
}

function rejectionMessage() {
    return new Message.Input([
        Text.paragraph(
            XmlCodec.System.encode('Error: Function call required, but not found.'),
        ),
    ]);
}

test('Engine stateful retries validator rejection without mutating session by default', async t => {
    const rejection = rejectionMessage();
    const engine = new FakeEngine([
        { kind: 'invalid' },
        { kind: 'valid' },
    ], {
        validate(message) {
            if (message.kind === 'invalid') return rejection;
        },
    }, {
        validate() {},
    });
    const session = { chatMessages: [] };

    const response = await engine.stateful({}, session);

    t.is(response.kind, 'valid');
    t.deepEqual(session.chatMessages, [
        { kind: 'valid' },
    ]);
});

test('Engine Recoverable middleware appends validator rejection into session history', async t => {
    const rejection = rejectionMessage();
    const engine = new FakeEngine([
        { kind: 'invalid' },
        { kind: 'valid' },
    ], {
        validate(message) {
            if (message.kind === 'invalid') return rejection;
        },
    }, {
        validate() {},
    });
    const recoveringEngine = engine.useStateful(Engine.Exceptions.InferenceError.Recoverable.recover);
    const session = { chatMessages: [] };

    const response = await recoveringEngine.stateful({}, session);

    t.is(response.kind, 'valid');
    t.deepEqual(session.chatMessages, [
        { kind: 'invalid' },
        rejection,
        { kind: 'valid' },
    ]);
});

test('Engine agentloop passes function call object to function handler', async t => {
    const fcall = Function.Call.of({
        id: 'call_1',
        name: 'noop',
        args: {},
    });
    const aiMessage = new Message.Output([fcall]);
    const finalMessage = new Message.Output([
        Text.paragraph('done'),
    ]);
    const engine = new FakeEngine([
        aiMessage,
        finalMessage,
    ], {
        validate() {},
    }, {
        validate() {},
    });
    const session = { chatMessages: [] };
    const fnm = {
        noop: async (args, receivedCall) => {
            t.deepEqual(args, {});
            t.is(receivedCall, fcall);
            return [new Text('ok')];
        },
    };

    const chunks = [];
    for await (const chunk of engine.agentloop({}, session, fnm, 2))
        chunks.push(chunk);

    t.deepEqual(chunks, []);
    t.deepEqual(session.chatMessages, [
        aiMessage,
        new Message.Input([
            Function.Response.Successful.of({
                id: 'call_1',
                name: 'noop',
                parts: [new Text('ok')],
            }),
        ]),
        finalMessage,
    ]);
});
