import test from 'ava';
import * as TypeChat from '../build/exports.js';


test('Public exports omit concrete engine namespaces', t => {
    t.is(TypeChat.GoogleEngine, undefined);
    t.is(TypeChat.OpenAIResponsesEngine, undefined);
    t.is(TypeChat.OpenAIChatCompletionsEngine, undefined);
    t.is(TypeChat.AnthropicEngine, undefined);
    t.is(TypeChat.OpenAICompatibleEngine, undefined);
});
