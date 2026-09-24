import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../../build/engine.js';
import { Throttle } from '../../build/throttle.js';
import { Text } from '../../build/text.js';
import { rejectRepetition } from '@zimtsui/typechat/repetition';
import { retry } from '@zimtsui/typechat/retry';

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

test('use registers the same middleware once in both independent chains, in registration order', async () => {
    const events = [];
    const mark = label => async (_wfctx, _session, next) => {
        events.push(`${label} enter`);
        const response = await next();
        events.push(`${label} exit`);
        return response;
    };
    const shared = mark('shared');
    const statelessResponse = normal();
    const statefulResponse = normal();
    const engine = new FakeEngine([statelessResponse, statefulResponse]);

    assert.strictEqual(engine
        .useStateless(mark('stateless before'))
        .useStateful(mark('stateful before'))
        .use(shared)
        .useStateless(mark('stateless after'))
        .useStateful(mark('stateful after')), engine);

    const statelessSession = { chatMessages: [] };
    assert.strictEqual(await engine.stateless({}, statelessSession), statelessResponse);
    assert.deepStrictEqual(statelessSession.chatMessages, []);

    const statefulSession = { chatMessages: [] };
    assert.strictEqual(await engine.stateful({}, statefulSession), statefulResponse);
    assert.deepStrictEqual(statefulSession.chatMessages, [statefulResponse]);
    assert.deepStrictEqual(events, [
        'stateless before enter', 'shared enter', 'stateless after enter',
        'stateless after exit', 'shared exit', 'stateless before exit',
        'stateful before enter', 'shared enter', 'stateful after enter',
        'stateful after exit', 'shared exit', 'stateful before exit',
    ]);
});

test('Repetition is allowed without middleware', async () => {
    const statelessResponse = repeating();
    const statefulResponse = repeating();
    const engine = new FakeEngine([statelessResponse, statefulResponse]);
    const statelessSession = { chatMessages: [] };
    const statefulSession = { chatMessages: [] };

    assert.strictEqual(await engine.stateless({}, statelessSession), statelessResponse);
    assert.deepStrictEqual(statelessSession.chatMessages, []);
    assert.strictEqual(await engine.stateful({}, statefulSession), statefulResponse);
    assert.deepStrictEqual(statefulSession.chatMessages, [statefulResponse]);
    assert.strictEqual(engine.requests, 2);
});

test('Stateful does not retry without retry middleware', async () => {
    const session = { chatMessages: [] };
    const engine = new FakeEngine([repeating(), normal()])
        .useStateful(rejectRepetition);

    await assert.rejects(engine.stateful({}, session), error =>
        error instanceof Engine.Exceptions.InferenceError && error.message === 'Repeating');
    assert.strictEqual(engine.requests, 1);
    assert.deepStrictEqual(session.chatMessages, []);
});

test('Stateless does not retry without retry middleware', async () => {
    const session = { chatMessages: [] };
    const engine = new FakeEngine([repeating(), normal()])
        .useStateless(rejectRepetition);

    await assert.rejects(engine.stateless({}, session), error =>
        error instanceof Engine.Exceptions.InferenceError && error.message === 'Repeating');
    assert.strictEqual(engine.requests, 1);
    assert.deepStrictEqual(session.chatMessages, []);
});

test('Stateless repetition middleware retries and does not mutate the session', async () => {
    const response = normal();
    const engine = new FakeEngine([repeating(), response])
        .useStateless(retry({ inferenceRetry: 1 }))
        .useStateless(rejectRepetition);
    const session = { chatMessages: [] };

    assert.strictEqual(await engine.stateless({}, session), response);
    assert.strictEqual(engine.requests, 2);
    assert.deepStrictEqual(session.chatMessages, []);
});

test('use enables retry and repetition checks in both independent chains', async () => {
    const statelessResponse = normal();
    const statefulResponse = normal();
    const engine = new FakeEngine([repeating(), statelessResponse, repeating(), statefulResponse])
        .use(retry({ inferenceRetry: 1 }))
        .use(rejectRepetition);
    const statelessSession = { chatMessages: [] };
    const statefulSession = { chatMessages: [] };

    assert.strictEqual(await engine.stateless({}, statelessSession), statelessResponse);
    assert.deepStrictEqual(statelessSession.chatMessages, []);
    assert.strictEqual(await engine.stateful({}, statefulSession), statefulResponse);
    assert.deepStrictEqual(statefulSession.chatMessages, [statefulResponse]);
    assert.strictEqual(engine.requests, 4);
});

test('Stateless retry must wrap repetition middleware to catch its rejection', async () => {
    const engine = new FakeEngine([repeating(), normal()])
        .useStateless(rejectRepetition)
        .useStateless(retry({ inferenceRetry: 1 }));

    await assert.rejects(engine.stateless({}, { chatMessages: [] }), error =>
        error instanceof Engine.Exceptions.InferenceError && error.message === 'Repeating');
    assert.strictEqual(engine.requests, 1);
});

test('Stateless retry repeats provider failures when registered', async () => {
    const response = normal();
    const engine = new FakeEngine([response]).useStateless(retry({ providerRetry: 1 }));
    const apiError = new Engine.Exceptions.APIError('unavailable');
    engine.transport.fetch = async () => {
        engine.requests++;
        if (engine.requests === 1) throw apiError;
        return response;
    };

    assert.strictEqual(await engine.stateless({}, { chatMessages: [] }), response);
    assert.strictEqual(engine.requests, 2);
});

test('Stateful repetition middleware retries without recording the rejected output', async () => {
    const response = normal();
    const engine = new FakeEngine([repeating(), response])
        .useStateful(retry({ inferenceRetry: 1 }))
        .useStateful(rejectRepetition);
    const session = { chatMessages: [] };

    assert.strictEqual(await engine.stateful({}, session), response);
    assert.strictEqual(engine.requests, 2);
    assert.deepStrictEqual(session.chatMessages, [response]);
});

test('Repetition middleware rejects output after retries are exhausted', async () => {
    const engine = new FakeEngine([repeating(), repeating()])
        .useStateful(retry({ inferenceRetry: 1 }))
        .useStateful(rejectRepetition);
    const session = { chatMessages: [] };

    await assert.rejects(engine.stateful({}, session), error =>
        error instanceof Engine.Exceptions.InferenceError && error.message === 'Repeating');
    assert.strictEqual(engine.requests, 2);
    assert.deepStrictEqual(session.chatMessages, []);
});

test('Retry must wrap repetition middleware to catch its rejection', async () => {
    const engine = new FakeEngine([repeating(), normal()])
        .useStateful(rejectRepetition)
        .useStateful(retry({ inferenceRetry: 1 }));

    await assert.rejects(engine.stateful({}, { chatMessages: [] }), error =>
        error instanceof Engine.Exceptions.InferenceError && error.message === 'Repeating');
    assert.strictEqual(engine.requests, 1);
});
