import test from 'ava';
import { Type } from 'typebox';
import { Adaptor } from '../build/adaptor.js';
import { Throttle } from '../build/throttle.js';
import { OpenAIResponsesEngine } from '../build/engines/openai-responses.js';
import { GoogleEngine } from '../build/engines/google.js';
import { OpenAIChatCompletionsEngine } from '../build/engines/openai-chatcompletions.js';
import { AnthropicEngine } from '../build/engines/anthropic.js';


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

test('Adaptor creates engines matching endpoint apiType', t => {
    const adaptor = Adaptor.create({
        endpoints: {
            openai: {
                apiType: 'openai-responses',
                baseUrl: 'https://example.invalid/openai',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Responses',
            },
            google: {
                apiType: 'google',
                baseUrl: 'https://example.invalid/google',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'Google',
            },
            openaiChatCompletions: {
                apiType: 'openai-chatcompletions',
                baseUrl: 'https://example.invalid/openai-chatcompletions',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Chat Completions',
            },
            anthropic: {
                apiType: 'anthropic',
                baseUrl: 'https://example.invalid/anthropic',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'Anthropic',
            },
        },
    });

    const openaiEngine = adaptor.makeEngine({
        endpoint: 'openai',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const googleEngine = adaptor.makeEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const openaiChatCompletionsEngine = adaptor.makeEngine({
        endpoint: 'openaiChatCompletions',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const anthropicEngine = adaptor.makeEngine({
        endpoint: 'anthropic',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(openaiEngine instanceof OpenAIResponsesEngine.Instance);
    t.true(googleEngine instanceof GoogleEngine.Instance);
    t.true(openaiChatCompletionsEngine instanceof OpenAIChatCompletionsEngine.Instance);
    t.true(anthropicEngine instanceof AnthropicEngine.Instance);
});

test('Adaptor creates dedicated Google and OpenAI Responses engines', t => {
    const adaptor = Adaptor.create({
        endpoints: {
            openai: {
                apiType: 'openai-responses',
                baseUrl: 'https://example.invalid/openai',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Responses',
            },
            google: {
                apiType: 'google',
                baseUrl: 'https://example.invalid/google',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'Google',
            },
        },
    });

    const openaiEngine = adaptor.makeOpenAIResponsesEngine({
        endpoint: 'openai',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });
    const googleEngine = adaptor.makeGoogleEngine({
        endpoint: 'google',
        functionDeclarationMap,
        verbatimDeclarationMap,
    });

    t.true(openaiEngine instanceof OpenAIResponsesEngine.Instance);
    t.true(googleEngine instanceof GoogleEngine.Instance);
});

test('Adaptor rejects unknown endpoint ids', t => {
    const adaptor = Adaptor.create({
        endpoints: {},
    });

    const error = t.throws(() => adaptor.makeEngine({
        endpoint: 'missing',
        functionDeclarationMap,
        verbatimDeclarationMap,
    }));

    t.truthy(error);
});

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

