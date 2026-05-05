import test from 'ava';
import { Function } from '../../../build/function.js';
import { ToolCodec } from '../../../build/engines/openai-chatcompletions/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';


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
    }), { instanceOf: SyntaxError, message: 'Unknown function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{',
        },
    }), { instanceOf: SyntaxError, message: 'Invalid JSON of function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'function',
        function: {
            name: 'echo',
            arguments: '{}',
        },
    }), { instanceOf: SyntaxError, message: 'Invalid arguments of function call.' });
});

test('OpenAI Chat Completions tool codec encodes function responses and requires ids', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });
    const successful = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        text: 'done',
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
    t.deepEqual(codec.encodeFunctionResponse(failed), {
        role: 'tool',
        tool_call_id: 'call_2',
        content: 'failed',
    });
    t.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        name: 'echo',
        text: 'done',
    })));
});
