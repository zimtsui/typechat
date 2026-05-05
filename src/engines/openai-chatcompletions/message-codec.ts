import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { ToolCodec } from './tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    protected vdm: vdm;
    public constructor(options: MessageCodec.Options<fdm, vdm>) {
        this.toolCodec = options.toolCodec;
        this.vdm = options.vdm;
    }

    public decodeAiMessage(
        message: OpenAI.ChatCompletionMessage,
    ): Engine.RoleMessage.Ai.From<fdm, vdm> {
        const parts: unknown[] = [];
        if (message.content) {
            const vreqs = VerbatimCodec.Request.decode(message.content, this.vdm);
            parts.push(new Engine.RoleMessage.Ai.Part.Text(message.content, vreqs));
        }
        if (message.tool_calls)
            for (const apifc of message.tool_calls)
                if (apifc.type === 'function')
                    parts.push(this.toolCodec.decodeFunctionCall(apifc));
                else throw new Error();
        if (parts.length) return new Engine.RoleMessage.Ai(parts);
        else throw new SyntaxError('Content or tool calls not found in Response', { cause: message });
    }

    public encodeDeveloperMessage(developerMessage: Engine.RoleMessage.Developer): OpenAI.ChatCompletionSystemMessageParam {
        return {
            role: 'system',
            content: developerMessage.getOnlyTextParts().map(part => part.text).join(''),
        };
    }

    public encodeUserMessage(
        userMessage: Engine.RoleMessage.User.From<fdm>,
    ): [OpenAI.ChatCompletionUserMessageParam] | OpenAI.ChatCompletionToolMessageParam[] {
        const textParts: Engine.RoleMessage.User.Part.Text[] = [];
        for (const part of userMessage.getParts())
            if (part instanceof Engine.RoleMessage.User.Part.Text) {
                const textPart = part;
                textParts.push(textPart);
            }
        const fress = userMessage.getFunctionResponses();
        if (textParts.length && !fress.length)
            return [{ role: 'user', content: textParts.map(part => ({ type: 'text', text: part.text })) }];
        else if (!textParts.length && fress.length)
            return fress.map(fres => this.toolCodec.encodeFunctionResponse(fres));
        else throw new Error('Unsupported user message type.');
    }

    public encodeAiMessage(
        aiMessage: Engine.RoleMessage.Ai.From<fdm, vdm>,
    ): OpenAI.ChatCompletionAssistantMessageParam {
        const parts = aiMessage.getParts();
        const textParts: Engine.RoleMessage.Ai.Part.Text.From<vdm>[] = [];
        const fcParts: Function.Call.From<fdm>[] = [];
        for (const part of parts) {
            if (part instanceof Engine.RoleMessage.Ai.Part.Text) {
                const textPart = part as Engine.RoleMessage.Ai.Part.Text.From<vdm>;
                textParts.push(textPart);
            } else if (part instanceof Function.Call) {
                const fcall = part as Function.Call.From<fdm>;
                fcParts.push(fcall);
            }
        }
        return {
            role: 'assistant',
            content: textParts.length ? textParts.map(part => part.text).join('') : undefined,
            tool_calls: fcParts.length ? fcParts.map(fcall => this.toolCodec.encodeFunctionCall(fcall)) : undefined,
        };
    }

    public encodeRoleMessage(
        roleMessage: Engine.Session.ChatMessage.From<fdm, vdm> | Engine.RoleMessage.Developer,
    ): OpenAI.ChatCompletionMessageParam[] {
        if (roleMessage instanceof Engine.RoleMessage.Developer)
            return [this.encodeDeveloperMessage(roleMessage)];
        else if (roleMessage instanceof Engine.RoleMessage.User) {
            const userMessage = roleMessage as Engine.RoleMessage.User.From<fdm>;
            return this.encodeUserMessage(userMessage);
        } else if (roleMessage instanceof Engine.RoleMessage.Ai) {
            const aiMessage = roleMessage as Engine.RoleMessage.Ai.From<fdm, vdm>;
            return [this.encodeAiMessage(aiMessage)];
        }
        else throw new Error();
    }

    public encodeRoleMessages(
        chatMessages: (Engine.Session.ChatMessage.From<fdm, vdm> | Engine.RoleMessage.Developer)[],
    ): OpenAI.ChatCompletionMessageParam[] {
        return chatMessages.map(chatMessage => this.encodeRoleMessage(chatMessage)).flat();
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        vdm: vdm;
    }
}
