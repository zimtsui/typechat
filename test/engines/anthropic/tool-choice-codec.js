import assert from 'node:assert/strict';
import test from 'node:test';
import * as AnthropicChoiceCodec from '../../../build/engines/anthropic/tool-choice-codec.js';
import { ToolChoice } from '../../../build/tool-choice.js';


test('Anthropic choice codec leaves disable_parallel_tool_use undefined when option is unspecified', () => {
    const encoded = AnthropicChoiceCodec.encode(ToolChoice.AUTO);

    assert.strictEqual(encoded.disable_parallel_tool_use, undefined);
});
