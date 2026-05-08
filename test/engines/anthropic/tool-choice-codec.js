import test from 'ava';
import * as AnthropicChoiceCodec from '../../../build/engines/anthropic/tool-choice-codec.js';
import { ToolChoice } from '../../../build/tool-choice.js';


test('Anthropic choice codec leaves disable_parallel_tool_use undefined when option is unspecified', t => {
    const encoded = AnthropicChoiceCodec.encode(ToolChoice.AUTO);

    t.is(encoded.disable_parallel_tool_use, undefined);
});
