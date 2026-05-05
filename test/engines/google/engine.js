import test from 'ava';
import { Adaptor } from '../../../build/adaptor.js';
import { GoogleEngine } from '../../../build/engines/google.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


test('Google engine rejects disabling parallel tool calls', t => {
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

    const error = t.throws(() => adaptor.makeGoogleEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    }));

    t.regex(error.message, /Parallel tool calling is required by Google engine\./);
});

test('Google engine allows omitted parallel tool call option', t => {
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

    const engine = adaptor.makeGoogleEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(engine instanceof GoogleEngine.Instance);
});
