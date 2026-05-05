import test from 'ava';
import * as AnthropicChoiceCodec from '../../../build/engines/anthropic/structuring-choice-codec.js';
import { StructuringChoice } from '../../../build/structuring-choice.js';


test('Anthropic choice codec leaves disable_parallel_tool_use undefined when option is unspecified', t => {
    const encoded = AnthropicChoiceCodec.encode(StructuringChoice.AUTO);

    t.is(encoded.disable_parallel_tool_use, undefined);
});
