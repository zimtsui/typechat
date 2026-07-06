import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Media } from '../../../build/media.js';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/google/tool-codec.js';
import { MessageCodec } from '../../../build/engines/google/message-codec.js';
import { functionDeclarationMap } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;

function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
}

test('Google codec encodes PDF user message', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Pdf(binary('pdf')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.strictEqual(encoded.role, 'user');
    assert.deepStrictEqual(encoded.parts, [{
        inlineData: {
            data: 'cGRm',
            mimeType: 'application/pdf',
        },
        mediaResolution: {
            level: 'MEDIA_RESOLUTION_MEDIUM',
        },
    }]);
});

test('Google codec encodes image user message with MIME essence', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Image(binary('png'), new MIMEType('image/png;charset=utf-8')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.strictEqual(encoded.role, 'user');
    assert.deepStrictEqual(encoded.parts, [{
        inlineData: {
            data: 'cG5n',
            mimeType: 'image/png',
        },
        mediaResolution: {
            level: 'MEDIA_RESOLUTION_HIGH',
        },
    }]);
});

test('Google codec encodes text media as quoted text', () => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Text('hello', new MIMEType('text/plain')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    assert.strictEqual(encoded.role, 'user');
    assert.deepStrictEqual(encoded.parts, [{
        text: '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>',
    }]);
});

test('Google codec decodes text and function calls', () => {
    const messageCodec = makeCodec();

    const raw = {
        role: 'model',
        parts: [
            { text: 'hello' },
            {
                functionCall: {
                    id: 'call_1',
                    name: 'noop',
                    args: {},
                },
            },
        ],
    };

    const outputMessage = messageCodec.decodeOutputMessage(raw);

    assert.strictEqual(outputMessage.joinText(), 'hello');
    assert.strictEqual(outputMessage.getOnlyFunctionCall().name, 'noop');
    assert.deepStrictEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});

test('Google codec rejects uncached output messages', () => {
    const messageCodec = makeCodec();
    const outputMessage = new Message.Output([new Text('hello')]);

    assert.throws(() => messageCodec.encodeOutputMessage(outputMessage), {
        message: 'Only native output message allowed.',
    });
});

test('Google codec rejects code execution output parts', () => {
    const messageCodec = makeCodec();

    assert.throws(() => messageCodec.decodeOutputMessage({
        role: 'model',
        parts: [{
            executableCode: {
                code: 'print(1)',
                language: 'PYTHON',
            },
        }],
    }), error => error instanceof Error && error.message === 'Executable code is not supported.');
    assert.throws(() => messageCodec.decodeOutputMessage({
        role: 'model',
        parts: [{
            codeExecutionResult: {
                outcome: 'OUTCOME_OK',
                output: '1\n',
            },
        }],
    }), error => error instanceof Error && error.message === 'Code execution result is not supported.');
});
