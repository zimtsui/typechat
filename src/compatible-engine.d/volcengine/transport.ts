import { Function } from '../../function.ts';
import { Transport as OpenAIResponsesTransport } from '../openai-responses/transport.ts';
import OpenAI from 'openai';
import type { Verbatim } from '../../verbatim.ts';
import { type Session } from '../../compatible-engine/session.ts';
import * as ChoiceCodec from '../openai-responses/choice-codec.ts';



export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> extends OpenAIResponsesTransport<fdm, vdm> {
    protected override makeParams(
        session: Session.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const tools = this.options.toolCodec.encodeFunctionDeclarationMap(this.options.fdm);
        return {
            model: this.options.inferenceParams.model,
            store: false,
            stream: true,
            input: session.chatMessages.flatMap(chatMessage => this.options.messageCodec.encodeChatMessage(chatMessage)),
            instructions: session.developerMessage && this.options.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.options.choice) : undefined,
            parallel_tool_calls: tools.length ? this.options.inferenceParams.parallelToolCall : undefined,
            ...this.options.inferenceParams.additionalOptions,
        };
    }

}
