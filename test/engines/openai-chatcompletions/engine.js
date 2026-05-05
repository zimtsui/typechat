import test from 'ava';
import { Adaptor } from '../../../build/adaptor.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


test('OpenAI Chat Completions engine rejects mixed function and verbatim declarations', t => {
    const adaptor = Adaptor.create({
        endpoints: {
            openaiChatCompletions: {
                apiType: 'openai-chatcompletions',
                baseUrl: 'https://example.invalid/openai-chatcompletions',
                apiKey: 'test-key',
                model: 'test-model',
                name: 'OpenAI Chat Completions',
            },
        },
    });

    const error = t.throws(() => adaptor.makeEngine({
        endpoint: 'openaiChatCompletions',
        functionDeclarationMap,
        verbatimDeclarationMap,
    }));

    t.is(error?.message, 'Functions cannot be declared together with Verbatim Channels in OpenAI ChatCompletions Engine.');
});
