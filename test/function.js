import test from 'ava';
import { Function } from '../build/function.js';
import { RoleMessage } from '../build/engine/message.js';


test('Function call stores id, name and typed args', t => {
    const call = Function.Call.of({
        id: 'call_1',
        name: 'echo',
        args: { text: 'hello' },
    });

    t.is(call.id, 'call_1');
    t.is(call.name, 'echo');
    t.deepEqual(call.args, { text: 'hello' });
});

test('Function successful response is collected from user message', t => {
    const response = Function.Response.Successful.of({
        id: 'call_1',
        name: 'echo',
        text: 'done',
    });
    const userMessage = new RoleMessage.User([response]);

    t.deepEqual(userMessage.getFunctionResponses(), [response]);
    t.is(userMessage.getOnlyFunctionResponse(), response);
});

test('Function failed response preserves error text', t => {
    const response = Function.Response.Failed.of({
        id: 'call_1',
        name: 'echo',
        error: 'failed',
    });

    t.true(response instanceof Function.Response);
    t.is(response.error, 'failed');
});
