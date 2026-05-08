import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { RoleMessage } from '../../../build/engine/message.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-chatcompletions/message-codec.js';
import { functionDeclarationMap } from '../../helpers.js';


function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
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

    t.is(error?.message, 'Unsupported part type.');
});

test('OpenAI chat completions codec splits mixed function responses and text', t => {
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
        Function.Response.Failed.of({
            id: 'call_1',
            name: 'noop',
            error: 'cancelled',
        }),
        new RoleMessage.User.Part.Text('retry with XML verbatim\n'),
    ]);

    const encoded = messageCodec.encodeUserMessage(userMessage);

    t.deepEqual(encoded, [
        {
            role: 'tool',
            tool_call_id: 'call_1',
            content: 'cancelled',
        },
        {
            role: 'user',
            content: [{
                type: 'text',
                text: 'retry with XML verbatim\n',
            }],
        },
    ]);
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
