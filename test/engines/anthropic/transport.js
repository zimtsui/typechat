import test from 'ava';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolCodec } from '../../../build/engines/anthropic/tool-codec.js';
import { MessageCodec } from '../../../build/engines/anthropic/message-codec.js';
import { Transport } from '../../../build/engines/anthropic/transport.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeTransport() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
    return new Transport({
        providerSpec: {
            baseUrl: 'https://example.invalid/anthropic',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        inferenceParams: {
            model: 'test-model',
            retry: 3,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        toolChoice: ToolChoice.AUTO,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
}

test('Anthropic transport propagates signal reason while streaming', async t => {
    const transport = makeTransport();
    const controller = new AbortController();
    const reason = new Error('cancelled');
    transport.client = {
        messages: {
            stream() {
                return (async function* () {
                    controller.abort(reason);
                    yield { type: 'message_stop' };
                })();
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
