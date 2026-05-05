import test from 'ava';
import { Function } from '../../../build/function.js';
import { ToolCodec } from '../../../build/engines/google/tool-codec.js';
import { functionDeclarationMapWithArgs } from '../../helpers.js';


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
    }), { instanceOf: SyntaxError, message: 'Unknown function call' });
    t.throws(() => codec.decodeFunctionCall({
        id: 'call_1',
        name: 'echo',
        args: {},
    }), { instanceOf: SyntaxError, message: 'Invalid arguments of function call.' });
});

test('Google tool codec encodes function responses', t => {
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
