import test from 'ava';
import { MIMEType } from 'node:util';
import { Media } from '../../../build/media.js';
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
    });
}

test('Google codec encodes PDF user message', t => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Pdf(binary('pdf')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    t.is(encoded.role, 'user');
    t.deepEqual(encoded.parts, [{
        inlineData: {
            data: 'cGRm',
            mimeType: 'application/pdf',
        },
        mediaResolution: {
            level: 'MEDIA_RESOLUTION_MEDIUM',
        },
    }]);
});

test('Google codec encodes text media as quoted text', t => {
    const messageCodec = makeCodec();
    const userMessage = new Message.Input([
        new Media.Text('hello', new MIMEType('text/plain')),
    ]);

    const encoded = messageCodec.encodeInputMessage(userMessage);

    t.is(encoded.role, 'user');
    t.deepEqual(encoded.parts, [{
        text: '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>',
    }]);
});

test('Google codec decodes text and function calls', t => {
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

    t.is(outputMessage.joinText(), 'hello');
    t.is(outputMessage.getOnlyFunctionCall().name, 'noop');
    t.deepEqual(messageCodec.encodeOutputMessage(outputMessage), raw);
});

test('Google codec rejects uncached output messages', t => {
    const messageCodec = makeCodec();
    const outputMessage = new Message.Output([new Text('hello')]);

    t.throws(() => messageCodec.encodeOutputMessage(outputMessage), {
        message: 'Only native output message allowed.',
    });
});

test('Google codec rejects code execution output parts', t => {
    const messageCodec = makeCodec();

    t.throws(() => messageCodec.decodeOutputMessage({
        role: 'model',
        parts: [{
            executableCode: {
                code: 'print(1)',
                language: 'PYTHON',
            },
        }],
    }), { instanceOf: Error, message: 'Executable code is not supported.' });
    t.throws(() => messageCodec.decodeOutputMessage({
        role: 'model',
        parts: [{
            codeExecutionResult: {
                outcome: 'OUTCOME_OK',
                output: '1\n',
            },
        }],
    }), { instanceOf: Error, message: 'Code execution result is not supported.' });
});
