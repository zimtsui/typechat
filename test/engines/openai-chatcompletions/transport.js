import test from 'ava';
import { RoleMessage } from '../../../build/engine/message.js';
import { StructuringChoice } from '../../../build/structuring-choice.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-chatcompletions/message-codec.js';
import { Transport } from '../../../build/engines/openai-chatcompletions/transport.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


function makeTransport(parallelToolCall) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    return new Transport({
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        structuringChoice: StructuringChoice.AUTO,
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        inferenceParams: {
            model: 'test-model',
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
        chatMessages: [new RoleMessage.User([
            new RoleMessage.User.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
    t.true(params.stream);
});

test('OpenAI Chat Completions transport streams usage by default', t => {
    const transport = makeTransport(false);
    const session = {
        chatMessages: [new RoleMessage.User([
            new RoleMessage.User.Part.Text('Hello.\n'),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, false);
    t.true(params.stream);
    t.deepEqual(params.stream_options, {
        include_usage: true,
    });
});
