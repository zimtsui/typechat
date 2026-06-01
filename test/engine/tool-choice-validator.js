import test from 'ava';
import { Function } from '../../build/function.js';
import { Message } from '../../build/engine/message.js';
import { ToolChoiceValidator } from '../../build/engine/tool-choice-validator.js';
import { ToolChoice } from '../../build/tool-choice.js';
import { Text } from '../../build/text.js';
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
const chat = new Text('chat');

function validate(toolChoice, parts) {
    const validator = new ToolChoiceValidator({ toolChoice });
    return validator.validate(new Message.Output(parts));
}

function getText(rejection) {
    return rejection.getTextParts().map(part => part.raw).join('');
}

test('Tool choice validator enforces at least one function call for REQUIRED', t => {
    const rejection = validate(ToolChoice.REQUIRED, [chat]);

    t.regex(getOnlyText(rejection), /Error: Function call required, but not found\./);
    t.is(validate(ToolChoice.REQUIRED, [fcall]), undefined);
});

test('Tool choice validator enforces exactly one function call for ANYONE', t => {
    const missing = validate(ToolChoice.ANYONE, [chat]);
    const duplicated = validate(ToolChoice.ANYONE, [fcall, fcall2]);

    t.regex(getOnlyText(missing), /Error: Function call required, but not found\./);
    t.is(getText(duplicated), '');
    t.regex(duplicated.getFunctionResponses()[0].error, /Error: Only 1 function call allowed, but multiple found\./);
    t.is(validate(ToolChoice.ANYONE, [fcall]), undefined);
});

test('Tool choice validator rejects function calls for NONE', t => {
    const rejection = validate(ToolChoice.NONE, [fcall]);

    t.is(getText(rejection), '');
    t.regex(rejection.getFunctionResponses()[0].error, /Error: No function call allowed\./);
    t.is(validate(ToolChoice.NONE, [chat]), undefined);
});
