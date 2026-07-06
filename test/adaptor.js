import assert from 'node:assert/strict';
import test from 'node:test';
import { Adaptor } from '../build/adaptor.js';
import { OpenAIResponsesEngine } from '../build/engines/openai-responses.js';
import { GoogleEngine } from '../build/engines/google.js';
import { OpenAIChatCompletionsEngine } from '../build/engines/openai-chatcompletions.js';
import { AnthropicEngine } from '../build/engines/anthropic.js';
import { OpenAICompatibleEngine } from '../build/engines/openai-compatible.js';
import { functionDeclarationMap } from './helpers.js';


test('Adaptor creates engines matching endpoint apiType', () => {
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
            openaiCompatible: {
                apiType: 'openai-compatible',
                baseUrl: 'https://example.invalid/openai-compatible',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Compatible',
            },
        },
    });

    const openaiEngine = adaptor.makeEngine({
        endpoint: 'openai',
        functionDeclarationMap,
    });
    const googleEngine = adaptor.makeEngine({
        endpoint: 'google',
        functionDeclarationMap,
    });
    const openaiChatCompletionsEngine = adaptor.makeEngine({
        endpoint: 'openaiChatCompletions',
        functionDeclarationMap,
    });
    const anthropicEngine = adaptor.makeEngine({
        endpoint: 'anthropic',
        functionDeclarationMap,
    });
    const openAICompatibleEngine = adaptor.makeEngine({
        endpoint: 'openaiCompatible',
        functionDeclarationMap,
    });

    assert.strictEqual(openaiEngine instanceof OpenAIResponsesEngine.Instance, true);
    assert.strictEqual(googleEngine instanceof GoogleEngine.Instance, true);
    assert.strictEqual(openaiChatCompletionsEngine instanceof OpenAIChatCompletionsEngine.Instance, true);
    assert.strictEqual(anthropicEngine instanceof AnthropicEngine.Instance, true);
    assert.strictEqual(openAICompatibleEngine instanceof OpenAICompatibleEngine.Instance, true);
});

test('Adaptor applies cache price fallback and override', () => {
    const adaptor = Adaptor.create({
        endpoints: {
            fallback: {
                apiType: 'openai-responses',
                baseUrl: 'https://example.invalid/openai',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Responses',
                inputPrice: 1.25,
            },
            explicit: {
                apiType: 'openai-responses',
                baseUrl: 'https://example.invalid/openai',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Responses',
                inputPrice: 1.25,
                cachePrice: 0.125,
            },
        },
    });

    const fallback = adaptor.makeEngine({
        endpoint: 'fallback',
        functionDeclarationMap,
    });
    const explicit = adaptor.makeEngine({
        endpoint: 'explicit',
        functionDeclarationMap,
    });

    assert.strictEqual(fallback.pricing.cachePrice, 1.25);
    assert.strictEqual(explicit.pricing.cachePrice, 0.125);
});

test('Adaptor rejects unknown endpoint ids', () => {
    const adaptor = Adaptor.create({
        endpoints: {},
    });

    assert.throws(() => adaptor.makeEngine({
        endpoint: 'missing',
        functionDeclarationMap,
    }));
});
