import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Engine } from '../../../build/engine.js';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/anthropic/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;

test('Anthropic tool codec encodes function declarations', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.partialDeepStrictEqual(codec.encodeFunctionDeclarationMap()[0], {
        name: 'echo',
        description: 'Echo text.',
    });
});

test('Anthropic tool codec decodes valid and empty function call arguments', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    const echo = codec.decodeFunctionCall({
        id: 'call_1',
        type: 'tool_use',
        name: 'echo',
        input: { text: 'hello' },
    });
    const noop = codec.decodeFunctionCall({
        id: 'call_2',
        type: 'tool_use',
        name: 'noop',
        input: {},
    });

    assert.strictEqual(echo.id, 'call_1');
    assert.strictEqual(echo.name, 'echo');
    assert.deepStrictEqual(echo.args, { text: 'hello' });
    assert.deepStrictEqual(noop.args, {});
});

test('Anthropic tool codec rejects invalid function calls', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'tool_use',
        name: 'missing',
        input: {},
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Unknown function call');
    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'tool_use',
        name: 'echo',
        input: {},
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Invalid arguments of function call.');
});

test('Anthropic tool codec encodes function responses and requires ids', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [
            new Text('done'),
            new Media.Text('quoted', new MIMEType('text/plain')),
            new Media.Image(binary('png'), new MIMEType('image/png;charset=utf-8')),
            new Media.Pdf(binary('pdf')),
        ],
    });
    const failed = Function.Response.Failed.of({
        id: 'call_2',
        name: 'echo',
        error: 'failed',
    });

    assert.deepStrictEqual(codec.encodeFunctionResponse(successful), {
        type: 'tool_result',
        tool_use_id: 'call_1',
        content: [
            {
                type: 'text',
                text: 'done',
            },
            {
                type: 'text',
                text: '<typechat:quotation mime-type="text/plain"><![CDATA[quoted]]></typechat:quotation>',
            },
            {
                type: 'image',
                source: {
                    type: 'base64',
                    data: 'cG5n',
                    media_type: 'image/png',
                },
            },
            {
                type: 'document',
                source: {
                    type: 'base64',
                    data: 'cGRm',
                    media_type: 'application/pdf',
                },
            },
        ],
    });
    assert.deepStrictEqual(codec.encodeFunctionResponse(failed), {
        type: 'tool_result',
        tool_use_id: 'call_2',
        content: 'failed',
    });
    assert.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        name: 'echo',
        parts: [new Text('done')],
    })));
});
