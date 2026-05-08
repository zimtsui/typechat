import test from 'ava';
import { StructuringChoice } from '../../../build/structuring-choice.js';
import { StructuringValidator } from '../../../build/engines/openai-responses/structuring-validator.js';
import { RoleMessage } from '../../../build/engines/openai-responses/message.js';
import { getOnlyText } from '../../helpers.js';


test('OpenAI Responses validator returns tool feedback when required call is missing', t => {
    const validator = new StructuringValidator({
        structuringChoice: StructuringChoice.REQUIRED,
    });
    const aiMessage = new RoleMessage.Ai([
        RoleMessage.Ai.Part.Text.paragraph('plain text'),
    ], []);

    const rejection = validator.validate(aiMessage);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /<typechat:system>Error: Tool call required, but not found\.<\/typechat:system>\n\n$/);
});
