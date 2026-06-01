import test from 'ava';
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

test('Anthropic codec rejects media user message', t => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Pdf(binary('pdf')),
    ]);

    const error = t.throws(() => messageCodec.encodeInputMessage(userMessage));

    t.truthy(error);
});

test('Anthropic codec encodes text media as quoted text', t => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Text('hello', new MIMEType('text/plain')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    t.deepEqual(encoded, [{
        type: 'text',
        text: '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>',
    }]);
});

test('Anthropic codec decodes text and tool use blocks', t => {
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

    t.is(outputMessage.joinText(), 'hello');
    t.is(outputMessage.getOnlyFunctionCall().name, 'noop');
    t.deepEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});

test('Anthropic codec rejects uncached output messages', t => {
    const messageCodec = makeCodec();
    const outputMessage = new Message.Output([new Text('hello')]);

    t.throws(() => messageCodec.encodeOutputMessage(outputMessage), {
        message: 'Only native output message allowed.',
    });
});

test('Anthropic codec preserves thinking blocks in cached raw output', t => {
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

    t.is(outputMessage.joinText(), 'hello');
    t.deepEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});
