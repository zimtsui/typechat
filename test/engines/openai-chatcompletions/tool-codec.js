import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Engine } from '../../../build/engine.js';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;

test('OpenAI Chat Completions tool codec encodes function declarations', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.partialDeepStrictEqual(codec.encodeFunctionDeclarationMap()[0], {
        type: 'function',
        function: {
            name: 'echo',
            description: 'Echo text.',
            strict: true,
        },
    });
});

test('OpenAI Chat Completions tool codec decodes valid and empty function call arguments', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    const echo = codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{"text":"hello"}',
        },
    });
    const noop = codec.decodeFunctionCall({
        id: 'call_2',
        type: 'function',
        function: {
            name: 'noop',
            arguments: '{}',
        },
    });

    assert.strictEqual(echo.id, 'call_1');
    assert.strictEqual(echo.name, 'echo');
    assert.deepStrictEqual(echo.args, { text: 'hello' });
    assert.deepStrictEqual(noop.args, {});
});

test('OpenAI Chat Completions tool codec rejects invalid function calls', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'missing',
            arguments: '{}',
        },
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Unknown function call');
    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{',
        },
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Invalid JSON of function call');
    assert.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{}',
        },
    }), error => error instanceof Engine.Exceptions.InferenceError && error.message === 'Invalid arguments of function call.');
});

test('OpenAI Chat Completions tool codec encodes function responses and requires ids', () => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        parts: [new Text('done')],
    });
    const successfulMediaText = Function.Response.Successful.of({
        id: 'call_3',
        name: 'echo',
        parts: [new Media.Text('quoted', new MIMEType('text/plain'))],
    });
    const failed = Function.Response.Failed.of({
        id: 'call_2',
        name: 'echo',
        error: 'failed',
    });

    assert.deepStrictEqual(codec.encodeFunctionResponse(successful), {
        role: 'tool',
        tool_call_id: 'call_1',
        content: 'done',
    });
    assert.deepStrictEqual(codec.encodeFunctionResponse(successfulMediaText), {
        role: 'tool',
        tool_call_id: 'call_3',
        content: '<typechat:quotation mime-type="text/plain"><![CDATA[quoted]]></typechat:quotation>',
    });
    assert.deepStrictEqual(codec.encodeFunctionResponse(failed), {
        role: 'tool',
        tool_call_id: 'call_2',
        content: 'failed',
    });
    assert.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        name: 'echo',
        parts: [new Text('done')],
    })));
    assert.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        id: 'call_4',
        name: 'echo',
        parts: [new Text('one'), new Text('two')],
    })), {
        message: 'OpenAI Chat Completions engine requires exactly one function response part.',
    });
    assert.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        id: 'call_5',
        name: 'echo',
        parts: [new Media.Image(binary('hello'), new MIMEType('image/png'))],
    })), {
        message: 'Unsupported function response part.',
    });
});
