import assert from 'node:assert/strict';
import test from 'node:test';
import * as TypeChat from '../build/exports.js';


test('Public exports omit concrete engine namespaces', () => {
    assert.strictEqual(TypeChat.GoogleEngine, undefined);
    assert.strictEqual(TypeChat.OpenAIResponsesEngine, undefined);
    assert.strictEqual(TypeChat.OpenAIChatCompletionsEngine, undefined);
    assert.strictEqual(TypeChat.AnthropicEngine, undefined);
    assert.strictEqual(TypeChat.OpenAICompatibleEngine, undefined);
});
