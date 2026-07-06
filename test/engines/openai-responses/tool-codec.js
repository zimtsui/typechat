import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Engine } from '../../../build/engine.js';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;


test('OpenAI Responses tool codec encodes function declarations', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.partialDeepStrictEqual(codec.encodeFunctionDeclarationMap()[0], {
        type: 'function',
        name: 'echo',
        description: 'Echo text.',
        strict: true,
    });
});

test('OpenAI Responses tool codec decodes valid and empty function call arguments', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    const echo = codec.decodeFunctionCall({
        type: 'function_call',
        call_id: 'call_1',
        name: 'echo',
        arguments: '{"text":"hello"}',
    });
    const noop = codec.decodeFunctionCall({
        type: 'function_call',
        call_id: 'call_2',
        name: 'noop',
        arguments: '{}',
    });

    assert.strictEqual(echo.id, 'call_1');
    assert.strictEqual(echo.name, 'echo');
    assert.deepStrictEqual(echo.args, { text: 'hello' });
    assert.deepStrictEqual(noop.args, {});
});

test('OpenAI Responses tool codec rejects invalid function calls', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.throws(() => codec.decodeFunctionCall({
        type: 'function_call',
        call_id: 'call_1',
        name: 'missing',
        arguments: '{}',
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Unknown function call');
    assert.throws(() => codec.decodeFunctionCall({
        type: 'function_call',
        call_id: 'call_1',
        name: 'echo',
        arguments: '{',
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Invalid JSON of function call');
    assert.throws(() => codec.decodeFunctionCall({
        type: 'function_call',
        call_id: 'call_1',
        name: 'echo',
        arguments: '{}',
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Invalid arguments of function call.');
});

test('OpenAI Responses tool codec encodes function responses and requires ids', () => {
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
        type: 'function_call_output',
        call_id: 'call_1',
        output: [{
            type: 'input_text',
            text: 'done',
        }],
    });
    assert.deepStrictEqual(codec.encodeFunctionResponse(failed), {
        type: 'function_call_output',
        call_id: 'call_2',
        output: 'failed',
    });
    assert.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        name: 'echo',
        parts: [new Text('done')],
    })));
});

test('OpenAI Responses tool codec encodes binary function response media with MIME essence', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [
            new Media.Image(binary('png'), new MIMEType('image/png;charset=utf-8')),
            new Media.Pdf(binary('pdf')),
        ],
    });

    assert.deepStrictEqual(codec.encodeFunctionResponse(successful), {
        type: 'function_call_output',
        call_id: 'call_1',
        output: [
            {
                type: 'input_image',
                image_url: 'data:image/png;base64,cG5n',
                detail: 'high',
            },
            {
                type: 'input_file',
                file_data: 'data:application/pdf;base64,cGRm',
            },
        ],
    });
});
