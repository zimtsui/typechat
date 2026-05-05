import test from 'ava';
import { Throttle } from '../../build/throttle.js';
import { Engine } from '../../build/engine.js';
import { Recoverable } from '../../build/engine/recoverable.js';
import * as VerbatimCodec from '../../build/verbatim/codec.js';
import { RoleMessage } from '../../build/engine/message.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../helpers.js';


class FakeEngine extends Engine.Instance {
    constructor(responses, structuringValidator, partsValidator) {
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
            verbatimDeclarationMap,
            inferenceRetry: 1,
        });
        this.responses = responses;
        this.structuringValidator = structuringValidator;
        this.partsValidator = partsValidator;
        this.transport = {
            fetch: async () => this.responses.shift(),
        };
    }

    clone() {
        const engine = new FakeEngine(this.responses, this.structuringValidator, this.partsValidator);
        engine.middlewaresStateless = [...this.middlewaresStateless];
        engine.middlewaresStateful = [...this.middlewaresStateful];
        return engine;
    }
}

function rejectionMessage() {
    return new RoleMessage.User([
        RoleMessage.User.Part.Text.paragraph(
            VerbatimCodec.System.encode('Error: Verbatim request required, but not found. Check your output format.'),
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
    const recoveringEngine = engine.useStateful(Recoverable.recover);
    const session = { chatMessages: [] };

    const response = await recoveringEngine.stateful({}, session);

    t.is(response.kind, 'valid');
    t.deepEqual(session.chatMessages, [
        { kind: 'invalid' },
        rejection,
        { kind: 'valid' },
    ]);
});
