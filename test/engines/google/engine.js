import assert from 'node:assert/strict';
import test from 'node:test';
import { Adaptor } from '../../../build/adaptor.js';
import { GoogleEngine } from '../../../build/engines/google.js';
import { functionDeclarationMap } from '../../helpers.js';


test('Google engine rejects disabling parallel tool calls', () => {
    const adaptor = Adaptor.create({
        config: {
            endpoints: {
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    model: 'test-model',
                    name: 'Google',
                    parallelToolCall: false,
                },
            },
        },
        secret: { endpoints: { google: { apiKey: 'test-key' } } },
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
        config: {
            endpoints: {
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    model: 'test-model',
                    name: 'Google',
                },
            },
        },
        secret: { endpoints: { google: { apiKey: 'test-key' } } },
    });

    const engine = adaptor.makeEngine({
        endpoint: 'google',
        functionDeclarationMap,
    });

    assert.strictEqual(engine instanceof GoogleEngine.Instance, true);
});
