import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import type { ToolCodec } from '../../api-types/anthropic/tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';

const NOMINAL = Symbol();


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> {
    public constructor(protected comps: MessageCodec.Components<fdm, vdm>) {}

    public encodeUserMessage(
        userMessage: RoleMessage.User.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        return userMessage.getParts().map(part => {
            if (part instanceof RoleMessage.Part.Text)
                return {
                    type: 'text',
                    text: part.text,
                } satisfies Anthropic.TextBlockParam;
            else if (part instanceof Function.Response)
                return this.comps.toolCodec.encodeFunctionResponse(part);
            else throw new Error();
        });
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): Anthropic.ContentBlockParam[] {
        if (aiMessage instanceof MessageCodec.Message.Ai)
            return aiMessage.getRaw();
        else {
            return aiMessage.getParts().map(part => {
                if (part instanceof RoleMessage.Part.Text)
                    return {
                        type: 'text',
                        text: part.text,
                    } satisfies Anthropic.TextBlockParam;
                else if (part instanceof Function.Call)
                    return this.comps.toolCodec.encodeFunctionCall(part);
                else throw new Error();
            });
        }
    }

    public encodeDeveloperMessage(
        developerMessage: RoleMessage.Developer,
    ): Anthropic.TextBlockParam[] {
        return developerMessage.getParts().map(part => ({ type: 'text', text: part.text }));
    }

    public encodeChatMessage(
        chatMessage: Session.ChatMessage.From<fdm, vdm>,
    ): Anthropic.MessageParam {
        if (chatMessage instanceof RoleMessage.User)
            return { role: 'user', content: this.encodeUserMessage(chatMessage) };
        else if (chatMessage instanceof RoleMessage.Ai)
            return { role: 'assistant', content: this.encodeAiMessage(chatMessage) };
        else throw new Error('Unsupported chat message type.');
    }

    public decodeAiMessage(
        raw: Anthropic.ContentBlock[],
    ): MessageCodec.Message.Ai.From<fdm, vdm> {
        const parts: RoleMessage.Ai.Part.From<fdm, vdm>[] = [];
        for (const item of raw) {
            if (item.type === 'text') {
                const vrs = VerbatimCodec.Request.decode(item.text, this.comps.vdm);
                parts.push(new RoleMessage.Part.Text(item.text, vrs));
            } else if (item.type === 'tool_use')
                parts.push(this.comps.toolCodec.decodeFunctionCall(item));
            else if (item.type === 'thinking') {}
            else throw new Error();
        }
        return new MessageCodec.Message.Ai(parts, raw);
    }
}

export namespace MessageCodec {
    export interface Components<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        vdm: vdm;
    }

    export namespace Message {
        export class Ai<
            in out fdu extends Function.Decl.Proto,
            in out vdu extends Verbatim.Decl.Proto,
        > extends RoleMessage.Ai<fdu, vdu> {
            protected declare [NOMINAL]: never;

            public constructor(
                parts: RoleMessage.Ai.Part<fdu, vdu>[],
                protected raw: Anthropic.ContentBlock[],
            ) {
                super(parts);
            }

            public getRaw(): Anthropic.ContentBlock[] {
                return this.raw;
            }
        }
        export namespace Ai {
            export type From<
                fdm extends Function.Decl.Map.Proto,
                vdm extends Verbatim.Decl.Map.Proto,
            > = Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
        }
    }
}
