import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../build/engine.js';
import { retry } from '@zimtsui/typechat/retry';

async function invokeRetry(options, sequence) {
    let attempts = 0;
    const middleware = retry(options);
    const response = await middleware({}, { chatMessages: [] }, async () => {
        const step = sequence[attempts++];
        if (step instanceof Error) throw step;
        return step;
    });
    return { response, attempts };
}

test('Retry tracks provider and inference errors independently', async () => {
    const response = new Engine.Message.Output([]);
    const result = await invokeRetry({ providerRetry: 1, inferenceRetry: 1 }, [
        new Engine.Exceptions.APIError(),
        new Engine.Exceptions.InferenceTimeout(),
        response,
    ]);

    assert.strictEqual(result.response, response);
    assert.strictEqual(result.attempts, 3);
});

test('Inference timeout and inference error share one retry budget', async () => {
    const timeout = new Engine.Exceptions.InferenceTimeout();
    const error = new Engine.Exceptions.InferenceError();
    const middleware = retry({ inferenceRetry: 1 });
    let attempts = 0;

    await assert.rejects(middleware({}, { chatMessages: [] }, async () => {
        throw [timeout, error][attempts++];
    }), caught => caught === error);
    assert.strictEqual(attempts, 2);
});

test('Retry does not catch unrelated errors', async () => {
    const error = new Error('unexpected');
    const middleware = retry();
    let attempts = 0;

    await assert.rejects(middleware({}, { chatMessages: [] }, async () => {
        attempts++;
        throw error;
    }), caught => caught === error);
    assert.strictEqual(attempts, 1);
});

test('Retry respects zero retries for both error categories', async () => {
    for (const error of [new Engine.Exceptions.InferenceError(), new Engine.Exceptions.APIError()]) {
        const middleware = retry({ providerRetry: 0, inferenceRetry: 0 });
        let attempts = 0;
        await assert.rejects(middleware({}, { chatMessages: [] }, async () => {
            attempts++;
            throw error;
        }), caught => caught === error);
        assert.strictEqual(attempts, 1);
    }
});
