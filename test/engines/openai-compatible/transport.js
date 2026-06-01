import test from 'ava';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-compatible/message-codec.js';
import { Transport } from '../../../build/engines/openai-compatible/transport.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeTransport(toolChoice, additionalHeaders) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
    });
    return new Transport({
        inferenceParams: {
            model: 'test-model',
            additionalHeaders,
            parallelToolCall: true,
            retry: 3,
        },
        providerSpec: {
            baseUrl: 'https://example.invalid/openai-compatible',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        toolChoice,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
}

test('OpenAI compatible transport downgrades required tool choice to auto', t => {
    const transport = makeTransport(ToolChoice.REQUIRED);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.tool_choice, 'auto');
});

test('OpenAI compatible transport downgrades anyone tool choice to auto', t => {
    const transport = makeTransport(ToolChoice.ANYONE);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.tool_choice, 'auto');
});

test('OpenAI compatible transport forwards additional headers', t => {
    const transport = makeTransport(ToolChoice.AUTO, {
        'x-provider-feature': 'enabled',
    });

    t.is(transport.client._options.defaultHeaders.get('x-provider-feature'), 'enabled');
});

test('OpenAI compatible transport preserves responses continuation options', t => {
    const transport = makeTransport(ToolChoice.AUTO);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.true(params.store);
    t.deepEqual(params.include, ['reasoning.encrypted_content']);
});

test('OpenAI compatible transport uses previous_response_id for cached output continuation', t => {
    const transport = makeTransport(ToolChoice.AUTO);
    const raw = {
        id: 'resp_1',
        object: 'response',
        created_at: 0,
        model: 'test-model',
        output: [{
            type: 'message',
            id: 'msg_1',
            role: 'assistant',
            status: 'completed',
            content: [{
                type: 'output_text',
                text: 'hello',
                annotations: [],
            }],
        }],
    };
    const outputMessage = transport.messageCodec.decodeOutputMessage(raw);
    const session = {
        developerMessage: new Message.Developer([new Text('ignored on continuation')]),
        chatMessages: [
            new Message.Input([new Text('first\n')]),
            outputMessage,
            new Message.Input([new Text('next\n')]),
        ],
    };

    const params = transport.makeParams(session);

    t.is(params.previous_response_id, 'resp_1');
    t.is(params.instructions, undefined);
    t.deepEqual(params.input, [{
        type: 'message',
        role: 'user',
        content: [{
            type: 'input_text',
            text: 'next\n',
        }],
    }]);
});

test('OpenAI compatible transport treats stream shutdown without response as connection error', async t => {
    const transport = makeTransport(ToolChoice.AUTO);
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

    const error = await t.throwsAsync(() => transport.fetch({}, session), {
        instanceOf: Engine.Exceptions.ConnectionError,
    });

    t.is(error?.message, 'Stream shut down');
});
