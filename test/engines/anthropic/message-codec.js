import test from 'ava';
import { Media } from '../../../build/media.js';
import { RoleMessage } from '../../../build/engine/message.js';
import { ToolCodec } from '../../../build/engines/anthropic/tool-codec.js';
import { MessageCodec } from '../../../build/engines/anthropic/message-codec.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
}

test('Anthropic codec rejects media user message', t => {
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
        new Media.Pdf('cGRm'),
    ]);

    const error = t.throws(() => messageCodec.encodeUserMessage(userMessage));

    t.truthy(error);
});

test('Anthropic codec decodes text and tool use blocks', t => {
    const messageCodec = makeCodec();

    const aiMessage = messageCodec.decodeAiMessage([
        {
            type: 'text',
            text: 'hello',
            citations: null,
        },
        {
            id: 'call_1',
            type: 'tool_use',
            name: 'noop',
            input: {},
        },
    ]);

    t.is(aiMessage.getText(), 'hello');
    t.is(aiMessage.getOnlyFunctionCall().name, 'noop');
});
