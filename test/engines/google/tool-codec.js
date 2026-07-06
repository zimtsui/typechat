import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Text } from '../../../build/text.js';
import { Engine } from '../../../build/engine.js';
import { Media } from '../../../build/media.js';
import { Function } from '../../../build/function.js';
import { ToolCodec } from '../../../build/engines/google/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;


test('Google tool codec encodes function declarations', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.partialDeepStrictEqual(codec.encodeFunctionDeclarationMap()[0], {
        name: 'echo',
        description: 'Echo text.',
    });
});

test('Google tool codec decodes valid and empty function call arguments', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    const echo = codec.decodeFunctionCall({
        id: 'call_1',
        name: 'echo',
        args: { text: 'hello' },
    });
    const noop = codec.decodeFunctionCall({
        id: 'call_2',
        name: 'noop',
        args: {},
    });

    assert.strictEqual(echo.id, 'call_1');
    assert.strictEqual(echo.name, 'echo');
    assert.deepStrictEqual(echo.args, { text: 'hello' });
    assert.deepStrictEqual(noop.args, {});
});

test('Google tool codec rejects invalid function calls', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        name: 'missing',
        args: {},
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Unknown function call');
    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        name: 'echo',
        args: {},
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Invalid arguments of function call.');
});

test('Google tool codec encodes function responses', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [new Text('done')],
    });
    const failed = Function.Response.Failed.of({
        id: 'call_2',
        name: 'echo',
        error: 'failed',
    });

    assert.deepStrictEqual(codec.encodeFunctionResponse(successful), {
        functionResponse: {
            id: 'call_1',
            name: 'echo',
            response: { output: 'done' },
        },
    });
    assert.deepStrictEqual(codec.encodeFunctionResponse(failed), {
        functionResponse: {
            id: 'call_2',
            name: 'echo',
            response: { error: 'failed' },
        },
    });
});

test('Google tool codec joins multiple text function response parts', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [
            new Text('plain\n'),
            new Media.Text('quoted', new MIMEType('text/plain')),
        ],
    });

    assert.deepStrictEqual(codec.encodeFunctionResponse(successful), {
        functionResponse: {
            id: 'call_1',
            name: 'echo',
            response: {
                output: 'plain\n<typechat:quotation mime-type="text/plain"><![CDATA[quoted]]></typechat:quotation>',
            },
        },
    });
});

test('Google tool codec encodes binary function response media with MIME essence', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [
            new Media.Image(binary('png'), new MIMEType('image/png;charset=utf-8')),
        ],
    });

    assert.deepStrictEqual(codec.encodeFunctionResponse(successful), {
        functionResponse: {
            id: 'call_1',
            name: 'echo',
            parts: [{
                inlineData: {
                    data: 'cG5n',
                    mimeType: 'image/png',
                    displayName: 'media',
                },
            }],
            response: {
                output: {
                    $ref: 'media',
                },
            },
        },
    });
});

test('Google tool codec rejects empty successful function response parts', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [],
    });

    assert.throws(() => codec.encodeFunctionResponse(successful), {
        message: 'Empty function response parts.',
    });
});
