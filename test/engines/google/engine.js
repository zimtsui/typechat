import assert from 'node:assert/strict';
import test from 'node:test';
import { Adaptor } from '../../../build/adaptor.js';
import { GoogleEngine } from '../../../build/engines/google.js';
import { functionDeclarationMap } from '../../helpers.js';


test('Google engine rejects disabling parallel tool calls', () => {
    const adaptor = Adaptor.create({
        endpoints: {
            google: {
                apiType: 'google',
                baseUrl: 'https://example.invalid/google',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'Google',
                parallelToolCall: false,
            },
        },
    });

    assert.throws(() => adaptor.makeEngine({
        endpoint: 'google',
        functionDeclarationMap,
    }), {
        message: /Parallel tool calling is required by Google engine\./,
    });
});

test('Google engine allows omitted parallel tool call option', () => {
    const adaptor = Adaptor.create({
        endpoints: {
            google: {
                apiType: 'google',
                baseUrl: 'https://example.invalid/google',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'Google',
            },
        },
    });

    const engine = adaptor.makeEngine({
        endpoint: 'google',
        functionDeclarationMap,
    });

    assert.strictEqual(engine instanceof GoogleEngine.Instance, true);
});
