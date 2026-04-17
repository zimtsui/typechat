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
    ): OpenAI.Responses.ResponseCreateParamsNonStreaming {
        const tools = this.ctx.toolCodec.encodeFunctionDeclarationMap(this.ctx.fdm);
        return {
            model: this.ctx.inferenceParams.model,
            store: false,
            input: session.chatMessages.flatMap(chatMessage => this.ctx.messageCodec.encodeChatMessage(chatMessage)),
            instructions: session.developerMessage && this.ctx.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.ctx.choice) : undefined,
            parallel_tool_calls: tools.length ? this.ctx.inferenceParams.parallelToolCall : undefined,
            ...this.ctx.inferenceParams.additionalOptions,
        };
    }

}
