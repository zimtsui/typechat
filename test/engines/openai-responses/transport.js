import test from 'ava';
import { RoleMessage } from '../../../build/engine/message.js';
import { StructuringChoice } from '../../../build/structuring-choice.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-responses/message-codec.js';
import { Transport } from '../../../build/engines/openai-responses/transport.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


function makeTransport(parallelToolCall) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
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
        structuringChoice: StructuringChoice.AUTO,
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
            new RoleMessage.User.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
});

test('OpenAI Responses transport reads disabled parallelToolCall from inferenceParams', t => {
    const transport = makeTransport(false);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.User.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, false);
    t.true(params.stream);
});

test('OpenAI Responses transport throws on stream error event', async t => {
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
        chatMessages: [new RoleMessage.User([
            new RoleMessage.User.Part.Text('Hello.\n'),
        ])],
    };

    const error = await t.throwsAsync(() => transport.fetch({}, session));

    t.is(error?.message, 'Response stream error');
});
