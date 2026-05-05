import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import { Media } from '../../../build/media.js';
import { RoleMessage } from '../../../build/engine/message.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-chatcompletions/message-codec.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
}

test('OpenAI chat completions codec rejects media user message', t => {
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
        new Media.Image({
            mimeType: new MIMEType('image/png'),
            base64: 'aGVsbG8=',
            resolution: 0,
        }),
    ]);

    const error = t.throws(() => messageCodec.encodeUserMessage(userMessage));

    t.is(error?.message, 'Unsupported user message type.');
});

test('OpenAI Chat Completions codec decodes text and tool calls', t => {
    const messageCodec = makeCodec();

    const aiMessage = messageCodec.decodeAiMessage({
        role: 'assistant',
        content: 'hello',
        tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: {
                name: 'noop',
                arguments: '{}',
            },
        }],
    });

    t.is(aiMessage.getText(), 'hello');
    t.is(aiMessage.getOnlyFunctionCall().name, 'noop');
});

test('OpenAI Chat Completions codec rejects empty assistant message', t => {
    const messageCodec = makeCodec();

    t.throws(() => messageCodec.decodeAiMessage({
        role: 'assistant',
    }), {
        instanceOf: SyntaxError,
        message: 'Content or tool calls not found in Response',
    });
});
