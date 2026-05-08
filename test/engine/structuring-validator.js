import test from 'ava';
import { Function } from '../../build/function.js';
import { RoleMessage } from '../../build/engine/message.js';
import { StructuringValidator } from '../../build/engine/structuring-validator.js';
import { StructuringChoice } from '../../build/structuring-choice.js';
import { getOnlyText } from '../helpers.js';


const fcall = Function.Call.of({
    id: 'call_1',
    name: 'noop',
    args: {},
});
const vreq = { name: 'note', args: { body: 'body' } };
const chat = new RoleMessage.Ai.Part.Text('chat', []);
const vtext = new RoleMessage.Ai.Part.Text('request', [vreq]);

function validate(structuringChoice, parts) {
    const validator = new StructuringValidator({ structuringChoice });
    return validator.validate(new RoleMessage.Ai(parts));
}

function getText(rejection) {
    return rejection.getTextParts().map(part => part.text).join('');
}

test('Structuring validator enforces required function calls', t => {
    t.throws(() => validate(StructuringChoice.TCall.REQUIRED, [chat]), {
        instanceOf: SyntaxError,
        message: 'Function call required.',
    });
    t.notThrows(() => validate(StructuringChoice.TCall.REQUIRED, [fcall]));
});

test('Structuring validator enforces exactly one function call for TCall.ANYONE', t => {
    t.throws(() => validate(StructuringChoice.TCall.ANYONE, [chat]), {
        message: 'Function call required.',
    });
    t.throws(() => validate(StructuringChoice.TCall.ANYONE, [fcall, fcall]), {
        message: 'Only 1 function call allowed.',
    });
    t.notThrows(() => validate(StructuringChoice.TCall.ANYONE, [fcall]));
});

test('Structuring validator returns feedback when verbatim request is required', t => {
    const rejection = validate(StructuringChoice.VRequest.REQUIRED, [chat]);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /Error: XML verbatim request required, but not found\./);
    t.is(validate(StructuringChoice.VRequest.REQUIRED, [vtext]), undefined);
});

test('Structuring validator enforces exactly one verbatim request for VRequest.ANYONE', t => {
    const missing = validate(StructuringChoice.VRequest.ANYONE, [chat]);
    const duplicated = validate(StructuringChoice.VRequest.ANYONE, [
        new RoleMessage.Ai.Part.Text('requests', [vreq, vreq]),
    ]);

    t.regex(getOnlyText(missing), /Error: XML verbatim request required, but not found\./);
    t.regex(getOnlyText(duplicated), /Error: Only 1 XML verbatim request allowed, but multiple found\./);
    t.is(validate(StructuringChoice.VRequest.ANYONE, [vtext]), undefined);
});

test('Structuring validator enforces at least one structured output for REQUIRED', t => {
    const rejection = validate(StructuringChoice.REQUIRED, [chat]);

    t.regex(getOnlyText(rejection), /Error: Either function call or XML verbatim request required, but none found\./);
    t.is(validate(StructuringChoice.REQUIRED, [fcall]), undefined);
    t.is(validate(StructuringChoice.REQUIRED, [vtext]), undefined);
});

test('Structuring validator enforces exactly one structured output for ANYONE', t => {
    const missing = validate(StructuringChoice.ANYONE, [chat]);
    const duplicated = validate(StructuringChoice.ANYONE, [fcall, vtext]);

    t.regex(getOnlyText(missing), /Error: Either 1 function call or 1 XML verbatim request required, but none found\./);
    t.regex(getText(duplicated), /Error: Either Only 1 function call or only 1 XML verbatim request allowed, but multiple found\./);
    t.is(duplicated.getFunctionResponses()[0].error, '<verbatim:system>Cancelled by system.</verbatim:system>\n');
    t.is(validate(StructuringChoice.ANYONE, [fcall]), undefined);
    t.is(validate(StructuringChoice.ANYONE, [vtext]), undefined);
});

test('Structuring validator rejects structured output for NONE', t => {
    const rejection = validate(StructuringChoice.NONE, [fcall]);

    t.regex(getText(rejection), /Error: Neither function call nor XML verbatim request allowed\./);
    t.is(rejection.getFunctionResponses()[0].error, '<verbatim:system>Cancelled by system.</verbatim:system>\n');
    t.is(validate(StructuringChoice.NONE, [chat]), undefined);
});
