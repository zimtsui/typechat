import test from 'ava';
import { MIMEType } from 'node:util';
import { Text } from '../../../build/text.js';
import { Engine } from '../../../build/engine.js';
import { Media } from '../../../build/media.js';
import { Function } from '../../../build/function.js';
import { ToolCodec } from '../../../build/engines/google/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;


test('Google tool codec encodes function declarations', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.like(codec.encodeFunctionDeclarationMap()[0], {
        name: 'echo',
        description: 'Echo text.',
    });
});

test('Google tool codec decodes valid and empty function call arguments', t => {
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

    t.is(echo.id, 'call_1');
    t.is(echo.name, 'echo');
    t.deepEqual(echo.args, { text: 'hello' });
    t.deepEqual(noop.args, {});
});

test('Google tool codec rejects invalid function calls', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        name: 'missing',
        args: {},
    }), { instanceOf: Engine.Exceptions.InferenceError, message: 'Unknown function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        name: 'echo',
        args: {},
    }), { instanceOf: Engine.Exceptions.InferenceError, message: 'Invalid arguments of function call.' });
});

test('Google tool codec encodes function responses', t => {
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

    t.deepEqual(codec.encodeFunctionResponse(successful), {
        functionResponse: {
            id: 'call_1',
            name: 'echo',
            response: { output: 'done' },
        },
    });
    t.deepEqual(codec.encodeFunctionResponse(failed), {
        functionResponse: {
            id: 'call_2',
            name: 'echo',
            response: { error: 'failed' },
        },
    });
});

test('Google tool codec joins multiple text function response parts', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [
            new Text('plain\n'),
            new Media.Text('quoted', new MIMEType('text/plain')),
        ],
    });

    t.deepEqual(codec.encodeFunctionResponse(successful), {
        functionResponse: {
            id: 'call_1',
            name: 'echo',
            response: {
                output: 'plain\n<typechat:quotation mime-type="text/plain"><![CDATA[quoted]]></typechat:quotation>',
            },
        },
    });
});

test('Google tool codec encodes binary function response media with MIME essence', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [
            new Media.Image(binary('png'), new MIMEType('image/png;charset=utf-8')),
        ],
    });

    t.deepEqual(codec.encodeFunctionResponse(successful), {
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

test('Google tool codec rejects empty successful function response parts', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [],
    });

    t.throws(() => codec.encodeFunctionResponse(successful), {
        message: 'Empty function response parts.',
    });
});
