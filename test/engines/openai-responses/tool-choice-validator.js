import test from 'ava';
import { ToolChoice } from '../../../build/tool-choice.js';
import { ToolChoiceValidator } from '../../../build/engines/openai-responses/tool-choice-validator.js';
import { RoleMessage } from '../../../build/engines/openai-responses/message.js';
import { getOnlyText } from '../../helpers.js';


test('OpenAI Responses validator returns tool feedback when required call is missing', t => {
    const validator = new ToolChoiceValidator({
        toolChoice: ToolChoice.REQUIRED,
    });
    const aiMessage = new RoleMessage.Ai([
        RoleMessage.Part.Text.paragraph('plain text'),
    ], { id: 'resp_1', output: [] });

    const rejection = validator.validate(aiMessage);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /<typechat:system>Error: Tool call required, but not found\.<\/typechat:system>\n\n$/);
});
