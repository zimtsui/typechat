import test from 'ava';
import { Adaptor } from '../build/adaptor.js';
import { OpenAIResponsesEngine } from '../build/engines/openai-responses.js';
import { GoogleEngine } from '../build/engines/google.js';
import { OpenAIChatCompletionsEngine } from '../build/engines/openai-chatcompletions.js';
import { AnthropicEngine } from '../build/engines/anthropic.js';
import { functionDeclarationMap, verbatimDeclarationMap } from './helpers.js';


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
        verbatimDeclarationMap: {},
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
