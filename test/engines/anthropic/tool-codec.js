import test from 'ava';
import { Function } from '../../../build/function.js';
import { ToolCodec } from '../../../build/engines/anthropic/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';


test('Anthropic tool codec encodes function declarations', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.like(codec.encodeFunctionDeclarationMap()[0], {
        name: 'echo',
        description: 'Echo text.',
    });
});

test('Anthropic tool codec decodes valid and empty function call arguments', t => {
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

    t.is(echo.id, 'call_1');
    t.is(echo.name, 'echo');
    t.deepEqual(echo.args, { text: 'hello' });
    t.deepEqual(noop.args, {});
});

test('Anthropic tool codec rejects invalid function calls', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'tool_use',
        name: 'missing',
        input: {},
    }), { instanceOf: SyntaxError, message: 'Unknown function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        type: 'tool_use',
        name: 'echo',
        input: {},
    }), { instanceOf: SyntaxError, message: 'Invalid arguments of function call.' });
});

test('Anthropic tool codec encodes function responses and requires ids', t => {
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
        type: 'tool_result',
        tool_use_id: 'call_1',
        content: 'done',
    });
    t.deepEqual(codec.encodeFunctionResponse(failed), {
        type: 'tool_result',
        tool_use_id: 'call_2',
        content: 'failed',
    });
    t.throws(() => codec.encodeFunctionResponse(Function.Response.Successful.of({
        name: 'echo',
        text: 'done',
    })));
});

test('Anthropic tool codec rejects encoding non-native function calls', t => {
    const codec = new ToolCodec({ fdm: functionDeclarationMapWithArgs });

    t.throws(() => codec.encodeFunctionCall(Function.Call.of({
        id: 'call_1',
        name: 'echo',
        args: { text: 'hello' },
    })), { message: 'Anthropic engine requires native function calls.' });
});
