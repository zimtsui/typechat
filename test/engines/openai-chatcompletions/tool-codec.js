import test from 'ava';
import { MIMEType } from 'node:util';
import { Engine } from '../../../build/engine.js';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { Text } from '../../../build/text.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';

const binary = text => new TextEncoder().encode(text).buffer;

test('OpenAI Chat Completions tool codec encodes function declarations', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.like(codec.encodeFunctionDeclarationMap()[0], {
        type: 'function',
        function: {
            name: 'echo',
            description: 'Echo text.',
            strict: true,
        },
    });
});

test('OpenAI Chat Completions tool codec decodes valid and empty function call arguments', t => {
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

    t.is(echo.id, 'call_1');
    t.is(echo.name, 'echo');
    t.deepEqual(echo.args, { text: 'hello' });
    t.deepEqual(noop.args, {});
});

test('OpenAI Chat Completions tool codec rejects invalid function calls', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'missing',
            arguments: '{}',
        },
    }), { instanceOf: Engine.Exceptions.InferenceError, message: 'Unknown function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{',
        },
    }), { instanceOf: Engine.Exceptions.InferenceError, message: 'Invalid JSON of function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{}',
        },
    }), { instanceOf: Engine.Exceptions.InferenceError, message: 'Invalid arguments of function call.' });
});

test('OpenAI Chat Completions tool codec encodes function responses and requires ids', t => {
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

    t.deepEqual(codec.encodeFunctionResponse(successful), {
        role: 'tool',
        tool_call_id: 'call_1',
        content: 'done',
    });
    t.deepEqual(codec.encodeFunctionResponse(successfulMediaText), {
        role: 'tool',
        tool_call_id: 'call_3',
        content: '<typechat:quotation mime-type="text/plain"><![CDATA[quoted]]></typechat:quotation>',
    });
    t.deepEqual(codec.encodeFunctionResponse(failed), {
        role: 'tool',
        tool_call_id: 'call_2',
        content: 'failed',
    });
    t.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        name: 'echo',
        parts: [new Text('done')],
    })));
    t.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        id: 'call_4',
        name: 'echo',
        parts: [new Text('one'), new Text('two')],
    })), {
        message: 'OpenAI Chat Completions engine requires exactly one function response part.',
    });
    t.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        id: 'call_5',
        name: 'echo',
        parts: [new Media.Image(binary('hello'), new MIMEType('image/png'))],
    })), {
        message: 'Unsupported function response part.',
    });
});
