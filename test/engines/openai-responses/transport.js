import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-responses/message-codec.js';
import { Transport } from '../../../build/engines/openai-responses/transport.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeTransport(parallelToolCall) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
    return new Transport({
        inferenceParams: {
            model: 'test-model',
            parallelToolCall,
            retry: 3,
        },
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        toolChoice: ToolChoice.AUTO,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
}

test('OpenAI Responses transport reads parallelToolCall from inference params', () => {
    const transport = makeTransport(true);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    assert.strictEqual(params.parallel_tool_calls, true);
    assert.deepStrictEqual(params.include, ['reasoning.encrypted_content']);
    assert.strictEqual(params.tools.some(tool => tool.type === 'apply_patch'), false);
});

test('OpenAI Responses transport reads disabled parallelToolCall from inferenceParams', () => {
    const transport = makeTransport(false);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    assert.strictEqual(params.parallel_tool_calls, false);
    assert.strictEqual(params.stream, true);
});

test('OpenAI Responses transport throws on stream error event', async () => {
    const transport = makeTransport(true);
    transport.client = {
        responses: {
            create: async function* () {
                yield {
                    type: 'error',
                    code: 'test_error',
                    message: 'stream failed',
                };
            },
        },
    };
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    let error;
    try {
        await transport.fetch({}, session);
    } catch (caught) {
        error = caught;
    }

    assert.strictEqual(error?.message, 'Response stream error');
});

test('OpenAI Responses transport treats stream shutdown without response as API error', async () => {
    const transport = makeTransport(true);
    transport.client = {
        responses: {
            create: async function* () {},
        },
    };
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    let error;
    try {
        await transport.fetch({}, session);
    } catch (caught) {
        error = caught;
    }

    assert.ok(error instanceof Engine.Exceptions.APIError);
    assert.strictEqual(error?.message, 'Stream shut down');
});
