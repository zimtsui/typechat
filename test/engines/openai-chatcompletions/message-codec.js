import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-chatcompletions/message-codec.js';
import { functionDeclarationMap } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;

function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
}

test('OpenAI chat completions codec rejects media user message', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Image(binary('hello'), new MIMEType('image/png')),
    ]);

    assert.throws(() => messageCodec.encodeInputMessage(userMessage), {
        message: 'Unsupported part type.',
    });
});

test('OpenAI chat completions codec splits mixed function responses and text', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        Function.Response.Failed.of({
            id: 'call_1',
            name: 'noop',
            error: 'cancelled',
        }),
        new Text('retry with XML verbatim\n'),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.deepStrictEqual(encoded, [
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

test('OpenAI chat completions codec omits empty user message for pure tool responses', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        Function.Response.Successful.of({
            id: 'call_1',
            name: 'noop',
            parts: [new Text('done')],
        }),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.deepStrictEqual(encoded, [{
        role: 'tool',
        tool_call_id: 'call_1',
        content: 'done',
    }]);
});

test('OpenAI chat completions codec encodes text media as quoted text', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Text('hello', new MIMEType('text/plain')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.deepStrictEqual(encoded, [{
        role: 'user',
        content: [{
            type: 'text',
            text: '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>',
        }],
    }]);
});

test('OpenAI Chat Completions codec decodes text and tool calls', () => {
    const messageCodec = makeCodec();

    const raw = {
        role: 'assistant',
        content: 'hello',
        refusal: null,
        tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: {
                name: 'noop',
                arguments: '{}',
            },
        }],
    };

    const outputMessage = messageCodec.decodeOutputMessage(raw);

    assert.strictEqual(outputMessage.joinText(), 'hello');
    assert.strictEqual(outputMessage.getOnlyFunctionCall().name, 'noop');
    assert.deepStrictEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});

test('OpenAI Chat Completions codec rejects uncached output messages', () => {
    const messageCodec = makeCodec();
    const outputMessage = new Message.Output([new Text('hello')]);

    assert.throws(() => messageCodec.encodeOutputMessage(outputMessage), {
        message: 'Only native output message allowed.',
    });
});

test('OpenAI Chat Completions codec rejects empty assistant message', () => {
    const messageCodec = makeCodec();

    assert.throws(() => messageCodec.decodeOutputMessage({
        role: 'assistant',
        content: null,
        refusal: null,
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Empty message.');
});
