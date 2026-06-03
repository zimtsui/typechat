import test from 'ava';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-chatcompletions/message-codec.js';
import { Transport } from '../../../build/engines/openai-chatcompletions/transport.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeTransport(parallelToolCall, additionalHeaders) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
    return new Transport({
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        toolChoice: ToolChoice.AUTO,
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        inferenceParams: {
            model: 'test-model',
            additionalHeaders,
            parallelToolCall,
            retry: 3,
        },
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
}

test('OpenAI Chat Completions transport reads parallelToolCall from inferenceParams', t => {
    const transport = makeTransport(true);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
    t.true(params.stream);
});

test('OpenAI Chat Completions transport streams usage by default', t => {
    const transport = makeTransport(false);
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, false);
    t.true(params.stream);
    t.deepEqual(params.stream_options, {
        include_usage: true,
    });
});

test('OpenAI Chat Completions transport forwards additional headers', t => {
    const transport = makeTransport(false, {
        'x-provider-feature': 'enabled',
    });

    t.is(transport.client._options.defaultHeaders.get('x-provider-feature'), 'enabled');
});

test('OpenAI Chat Completions transport propagates signal reason while streaming', async t => {
    const transport = makeTransport(false);
    const controller = new AbortController();
    const reason = new Error('cancelled');
    transport.client = {
        chat: {
            completions: {
                create: async function* () {
                    controller.abort(reason);
                    yield {};
                },
            },
        },
    };
    const session = {
        chatMessages: [new Message.Input([
            new Text('Hello.\n'),
        ])],
    };

    const error = await t.throwsAsync(() => transport.fetch({}, session, controller.signal));

    t.is(error, reason);
});
