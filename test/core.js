import test from 'ava';
import { Type } from 'typebox';
import { Adaptor } from '../build/adaptor.js';
import { Throttle } from '../build/throttle.js';
import { OpenAIResponsesCompatibleEngine } from '../build/compatible-engine.d/openai-responses.js';
import { GoogleCompatibleEngine } from '../build/compatible-engine.d/google.js';
import { OpenAIChatCompletionsCompatibleEngine } from '../build/compatible-engine.d/openai-chatcompletions.js';
import { OpenAIResponsesNativeEngine } from '../build/native-engines.d/openai-responses.js';
import { GoogleNativeEngine } from '../build/native-engines.d/google.js';


const functionDeclarationMap = {
    noop: {
        description: 'No-op tool.',
        parameters: Type.Object({}),
    },
};

const verbatimDeclarationMap = {
    note: {
        description: 'A note.',
        parameters: {
            body: {
                description: 'Body text.',
                mimeType: 'text/plain',
            },
        },
    },
};

test('Throttle bypasses locking when rpm is unlimited', async t => {
    const throttle = new Throttle(Number.POSITIVE_INFINITY);
    let acquireReadCalls = 0;
    let releaseReadCalls = 0;

    await throttle.requests({
        busy: {
            acquireRead: async () => {
                acquireReadCalls++;
            },
            releaseRead: () => {
                releaseReadCalls++;
            },
        },
    });

    t.is(acquireReadCalls, 0);
    t.is(releaseReadCalls, 0);
});

test('Throttle acquires and releases busy lock when rpm is finite', async t => {
    const throttle = new Throttle(60000);
    let acquireReadCalls = 0;
    let releaseReadCalls = 0;

    await throttle.requests({
        busy: {
            acquireRead: async () => {
                acquireReadCalls++;
            },
            releaseRead: () => {
                releaseReadCalls++;
            },
        },
    });

    t.is(acquireReadCalls, 1);
    t.is(releaseReadCalls, 1);
});

test('Adaptor creates compatible engines matching endpoint apiType', t => {
    const adaptor = Adaptor.create({
        typechat: {
            endpoints: {
                openai: {
                    apiType: 'openai-responses',
                    baseUrl: 'https://example.invalid/openai',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'OpenAI Compatible',
                },
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'Google Compatible',
                },
                openaiChatCompletions: {
                    apiType: 'openai-chatcompletions',
                    baseUrl: 'https://example.invalid/openai-chatcompletions',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'OpenAI Chat Completions Compatible',
                },
            },
        },
    });

    const openaiEngine = adaptor.makeCompatibleEngine({
        endpoint: 'openai',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const googleEngine = adaptor.makeCompatibleEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const openaiChatCompletionsEngine = adaptor.makeCompatibleEngine({
        endpoint: 'openaiChatCompletions',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(openaiEngine instanceof OpenAIResponsesCompatibleEngine.Instance);
    t.true(googleEngine instanceof GoogleCompatibleEngine.Instance);
    t.true(openaiChatCompletionsEngine instanceof OpenAIChatCompletionsCompatibleEngine.Instance);
});

test('Adaptor creates native engines matching endpoint apiType', t => {
    const adaptor = Adaptor.create({
        typechat: {
            endpoints: {
                openai: {
                    apiType: 'openai-responses',
                    baseUrl: 'https://example.invalid/openai',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'OpenAI Native',
                },
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'Google Native',
                },
            },
        },
    });

    const openaiEngine = adaptor.makeOpenAIResponsesNativeEngine({
        endpoint: 'openai',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const googleEngine = adaptor.makeGoogleNativeEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(openaiEngine instanceof OpenAIResponsesNativeEngine.Instance);
    t.true(googleEngine instanceof GoogleNativeEngine.Instance);
});

test('Adaptor rejects unknown endpoint ids', t => {
    const adaptor = Adaptor.create({
        typechat: {
            endpoints: {},
        },
    });

    const error = t.throws(() => adaptor.makeCompatibleEngine({
        endpoint: 'missing',
        functionDeclarationMap,
        verbatimDeclarationMap,
    }));

    t.truthy(error);
});

test('Google native engine rejects disabling parallel tool calls', t => {
    const adaptor = Adaptor.create({
        typechat: {
            endpoints: {
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'Google Native',
                    parallelToolCall: false,
                },
            },
        },
    });

    const error = t.throws(() => adaptor.makeGoogleNativeEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    }));

    t.regex(error.message, /Parallel tool calling is required by Google engine\./);
});

test('Google compatible engine allows omitted parallel tool call option', t => {
    const adaptor = Adaptor.create({
        typechat: {
            endpoints: {
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'Google Compatible',
                },
            },
        },
    });

    const engine = adaptor.makeCompatibleEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(engine instanceof GoogleCompatibleEngine.Instance);
});

test('Google native engine allows omitted parallel tool call option', t => {
    const adaptor = Adaptor.create({
        typechat: {
            endpoints: {
                google: {
                    apiType: 'google',
                    baseUrl: 'https://example.invalid/google',
                    apiKey: 'test-key',
                    model: 'test-model',
                    name: 'Google Native',
                },
            },
        },
    });

    const engine = adaptor.makeGoogleNativeEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(engine instanceof GoogleNativeEngine.Instance);
});
