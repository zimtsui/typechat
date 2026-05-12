import test from 'ava';
import { Adaptor } from '../build/adaptor.js';
import { OpenAIResponsesEngine } from '../build/engines/openai-responses.js';
import { GoogleEngine } from '../build/engines/google.js';
import { OpenAIChatCompletionsEngine } from '../build/engines/openai-chatcompletions.js';
import { AnthropicEngine } from '../build/engines/anthropic.js';
import { OpenAICompatibleEngine } from '../build/engines/openai-compatible.js';
import { functionDeclarationMap } from './helpers.js';


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

    t.true(openaiEngine instanceof OpenAIResponsesEngine.Instance);
    t.true(googleEngine instanceof GoogleEngine.Instance);
    t.true(openaiChatCompletionsEngine instanceof OpenAIChatCompletionsEngine.Instance);
    t.true(anthropicEngine instanceof AnthropicEngine.Instance);
    t.true(openAICompatibleEngine instanceof OpenAICompatibleEngine.Instance);
});

test('Adaptor applies cache price fallback and override', t => {
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

    t.is(fallback.pricing.cachePrice, 1.25);
    t.is(explicit.pricing.cachePrice, 0.125);
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
    });
    const googleEngine = adaptor.makeGoogleEngine({
        endpoint: 'google',
        functionDeclarationMap,
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
    }));

    t.truthy(error);
});
