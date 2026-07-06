import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Media } from '../../../build/media.js';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/anthropic/tool-codec.js';
import { MessageCodec } from '../../../build/engines/anthropic/message-codec.js';
import { functionDeclarationMap } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;

function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
}

test('Anthropic codec rejects media user message', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Pdf(binary('pdf')),
    ]);

    assert.throws(() => messageCodec.encodeInputMessage(userMessage));
});

test('Anthropic codec encodes text media as quoted text', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Text('hello', new MIMEType('text/plain')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.deepStrictEqual(encoded, [{
        type: 'text',
        text: '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>',
    }]);
});

test('Anthropic codec decodes text and tool use blocks', () => {
    const messageCodec = makeCodec();

    const raw = [
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
    ];

    const outputMessage = messageCodec.decodeOutputMessage(raw);

    assert.strictEqual(outputMessage.joinText(), 'hello');
    assert.strictEqual(outputMessage.getOnlyFunctionCall().name, 'noop');
    assert.deepStrictEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});

test('Anthropic codec rejects uncached output messages', () => {
    const messageCodec = makeCodec();
    const outputMessage = new Message.Output([new Text('hello')]);

    assert.throws(() => messageCodec.encodeOutputMessage(outputMessage), {
        message: 'Only native output message allowed.',
    });
});

test('Anthropic codec preserves thinking blocks in cached raw output', () => {
    const messageCodec = makeCodec();
    const raw = [
        {
            type: 'thinking',
            thinking: 'hidden',
            signature: 'sig',
        },
        {
            type: 'redacted_thinking',
            data: 'encrypted',
        },
        {
            type: 'text',
            text: 'hello',
            citations: null,
        },
    ];

    const outputMessage = messageCodec.decodeOutputMessage(raw);

    assert.strictEqual(outputMessage.joinText(), 'hello');
    assert.deepStrictEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});
