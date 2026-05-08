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
const fcall2 = Function.Call.of({
    id: 'call_2',
    name: 'noop',
    args: {},
});
const chat = new RoleMessage.Ai.Part.Text('chat');

function validate(structuringChoice, parts) {
    const validator = new StructuringValidator({ structuringChoice });
    return validator.validate(new RoleMessage.Ai(parts));
}

function getText(rejection) {
    return rejection.getTextParts().map(part => part.text).join('');
}

test('Structuring validator enforces at least one function call for REQUIRED', t => {
    const rejection = validate(StructuringChoice.REQUIRED, [chat]);

    t.regex(getOnlyText(rejection), /Error: Function call required, but not found\./);
    t.is(validate(StructuringChoice.REQUIRED, [fcall]), undefined);
});

test('Structuring validator enforces exactly one function call for ANYONE', t => {
    const missing = validate(StructuringChoice.ANYONE, [chat]);
    const duplicated = validate(StructuringChoice.ANYONE, [fcall, fcall2]);

    t.regex(getOnlyText(missing), /Error: Function call required, but not found\./);
    t.regex(getText(duplicated), /Error: Only 1 function call allowed, but multiple found\./);
    t.is(duplicated.getFunctionResponses()[0].error, '<typechat:system>Cancelled by system.</typechat:system>\n');
    t.is(validate(StructuringChoice.ANYONE, [fcall]), undefined);
});

test('Structuring validator rejects function calls for NONE', t => {
    const rejection = validate(StructuringChoice.NONE, [fcall]);

    t.regex(getText(rejection), /Error: No function call allowed\./);
    t.is(rejection.getFunctionResponses()[0].error, '<typechat:system>Cancelled by system.</typechat:system>\n');
    t.is(validate(StructuringChoice.NONE, [chat]), undefined);
});
