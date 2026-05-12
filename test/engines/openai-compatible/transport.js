import test from 'ava';
import { RoleMessage } from '../../../build/engine/message.js';
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
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.tool_choice, 'auto');
});

test('OpenAI compatible transport downgrades anyone tool choice to auto', t => {
    const transport = makeTransport(ToolChoice.ANYONE);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.Part.Text('Hello.\n'),
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
