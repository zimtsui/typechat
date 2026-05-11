import test from 'ava';
import { RoleMessage } from '../../../build/engine/message.js';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-responses/message-codec.js';
import { Transport } from '../../../build/engines/openai-responses/transport.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeTransport(parallelToolCall) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
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
        applyPatch: false,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
}

test('OpenAI Responses transport reads parallelToolCall from inference params', t => {
    const transport = makeTransport(true);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
});

test('OpenAI Responses transport reads disabled parallelToolCall from inferenceParams', t => {
    const transport = makeTransport(false);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, false);
    t.false(params.stream);
});

test('OpenAI Responses transport throws on abnormal response status', async t => {
    const transport = makeTransport(true);
    transport.client = {
        responses: {
            create: async () => ({
                id: 'resp_1',
                status: 'failed',
                output: [],
                usage: {
                    input_tokens: 0,
                    output_tokens: 0,
                    total_tokens: 0,
                },
            }),
        },
    };
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
        ])],
    };

    const error = await t.throwsAsync(() => transport.fetch({}, session));

    t.is(error?.message, 'Abnormal response status');
});
