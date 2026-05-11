import test from 'ava';
import { RoleMessage } from '../../../build/engine/message.js';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-responses/message-codec.js';
import { Transport } from '../../../build/engines/dashscope/transport.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeTransport(toolChoice) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
    });
    return new Transport({
        inferenceParams: {
            model: 'test-model',
            parallelToolCall: true,
            retry: 3,
        },
        providerSpec: {
            baseUrl: 'https://example.invalid/dashscope',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        toolChoice,
        applyPatch: false,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
}

test('DashScope transport downgrades required tool choice to auto', t => {
    const transport = makeTransport(ToolChoice.REQUIRED);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.tool_choice, 'auto');
});

test('DashScope transport downgrades anyone tool choice to auto', t => {
    const transport = makeTransport(ToolChoice.ANYONE);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.tool_choice, 'auto');
});
