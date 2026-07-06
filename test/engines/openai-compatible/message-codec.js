import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Function } from '../../../build/function.js';
import { Engine } from '../../../build/engine.js';
import { Message } from '../../../build/engine/message.js';
import { Media } from '../../../build/media.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-compatible/message-codec.js';
import { functionDeclarationMap } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;


function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        messageValidator: new Engine.MessageValidator(),
    });
}

test('OpenAI compatible codec encodes user input and function responses', () => {
    const messageCodec = makeCodec();
    const inputMessage = new Message.Input([
        Function.Response.Successful.of({
            id: 'call_1',
            name: 'noop',
            parts: [new Text('done')],
        }),
        new Text('Hello.\n'),
        new Media.Image(binary('hello'), new MIMEType('image/png;charset=utf-8')),
    ]);

    const encoded = messageCodec.encodeInputMessage(inputMessage);

    assert.deepStrictEqual(encoded, [
        {
            type: 'function_call_output',
            call_id: 'call_1',
            output: [{
                type: 'input_text',
                text: 'done',
            }],
        },
        {
            type: 'message',
            role: 'user',
            content: [
                {
                    type: 'input_text',
                    text: 'Hello.\n',
                },
                {
                    type: 'input_image',
                    image_url: 'data:image/png;base64,aGVsbG8=',
                    detail: 'auto',
                },
            ],
        },
    ]);
});

test('OpenAI compatible codec omits empty user message for pure function responses', () => {
    const messageCodec = makeCodec();
    const inputMessage = new Message.Input([
        Function.Response.Successful.of({
            id: 'call_1',
            name: 'noop',
            parts: [new Text('done')],
        }),
    ]);

    const encoded = messageCodec.encodeInputMessage(inputMessage);

    assert.deepStrictEqual(encoded, [{
        type: 'function_call_output',
        call_id: 'call_1',
        output: [{
            type: 'input_text',
            text: 'done',
        }],
    }]);
});

test('OpenAI compatible codec decodes output and replays cached raw output', () => {
    const messageCodec = makeCodec();
    const raw = {
        id: 'resp_1',
        object: 'response',
        created_at: 0,
        model: 'test-model',
        output: [
            {
                type: 'message',
                id: 'msg_1',
                role: 'assistant',
                status: 'completed',
                content: [{
                    type: 'output_text',
                    text: 'hello',
                    annotations: [],
                }],
            },
            {
                type: 'function_call',
                id: 'fc_1',
                call_id: 'call_1',
                name: 'noop',
                arguments: '{}',
                status: 'completed',
            },
        ],
    };

    const outputMessage = messageCodec.decodeOutputMessage(raw);

    assert.strictEqual(outputMessage.joinText(), 'hello');
    assert.strictEqual(outputMessage.getFunctionCalls()[0].name, 'noop');
    assert.deepStrictEqual(messageCodec.encodeOutputMessage(outputMessage), raw.output);
    assert.strictEqual(messageCodec.getResponseId(outputMessage), 'resp_1');
});

test('OpenAI compatible codec rejects uncached output messages', () => {
    const messageCodec = makeCodec();
    const outputMessage = new Message.Output([new Text('hello')]);

    assert.throws(() => messageCodec.encodeOutputMessage(outputMessage), {
        message: 'Only native output message allowed.',
    });
});
