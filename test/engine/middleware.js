import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../../build/engine.js';
import { Throttle } from '../../build/throttle.js';
import { Text } from '../../build/text.js';
import { rejectRepetition } from '@zimtsui/typechat/repetition';

class FakeEngine extends Engine.Instance {
    constructor(responses) {
        super({
            throttle: new Throttle(Number.POSITIVE_INFINITY),
            endpointConfig: {
                name: 'Fake Engine',
                baseUrl: 'https://example.invalid/fake',
                model: 'test-model',
                apiType: 'openai-responses',
            },
            endpointSecret: { apiKey: 'test-key' },
            functionDeclarationMap: {},
            inferenceRetry: 1,
        });
        this.responses = responses;
        this.requests = 0;
        this.transport = {
            fetch: async () => {
                this.requests++;
                return this.responses.shift();
            },
        };
    }
}

const repeating = () => new Engine.Message.Output([new Text('a'.repeat(1024))]);
const normal = () => new Engine.Message.Output([new Text('done')]);

test('Repetition is allowed without middleware', async () => {
    const response = repeating();
    const engine = new FakeEngine([response]);

    assert.strictEqual(await engine.stateless({}, { chatMessages: [] }), response);
    assert.strictEqual(engine.requests, 1);
});

test('Stateless repetition middleware retries and does not mutate the session', async () => {
    const response = normal();
    const engine = new FakeEngine([repeating(), response])
        .useStateless(rejectRepetition);
    const session = { chatMessages: [] };

    assert.strictEqual(await engine.stateless({}, session), response);
    assert.strictEqual(engine.requests, 2);
    assert.deepStrictEqual(session.chatMessages, []);
});

test('Stateful repetition middleware retries without recording the rejected output', async () => {
    const response = normal();
    const engine = new FakeEngine([repeating(), response])
        .useStateful(rejectRepetition);
    const session = { chatMessages: [] };

    assert.strictEqual(await engine.stateful({}, session), response);
    assert.strictEqual(engine.requests, 2);
    assert.deepStrictEqual(session.chatMessages, [response]);
});

test('Repetition middleware rejects output after retries are exhausted', async () => {
    const engine = new FakeEngine([repeating(), repeating()])
        .useStateful(rejectRepetition);
    const session = { chatMessages: [] };

    await assert.rejects(engine.stateful({}, session), error =>
        error instanceof Engine.Exceptions.InferenceError && error.message === 'Repeating');
    assert.strictEqual(engine.requests, 2);
    assert.deepStrictEqual(session.chatMessages, []);
});
