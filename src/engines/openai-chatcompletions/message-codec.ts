import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
    }

    public decodeAiMessage(
        message: OpenAI.ChatCompletionMessage,
    ): Engine.RoleMessage.Ai.From<fdm> {
        const parts: unknown[] = [];
        if (message.content)
            parts.push(new Engine.RoleMessage.Ai.Part.Text(message.content));
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
    ): (OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionToolMessageParam)[] {
        for (const part of userMessage.getParts())
            if (part instanceof Function.Response) {}
            else if (part instanceof Engine.RoleMessage.User.Part.Text) {}
            else if (part instanceof Media.Text) {}
            else throw new Error('Unsupported part type.');

        const apiMessages: (OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionToolMessageParam)[] = [];

        const fress = userMessage.getFunctionResponses();
        for (const fres of fress)
            apiMessages.push(this.toolCodec.encodeFunctionResponse(fres));

        const contentParts: OpenAI.ChatCompletionContentPart[] = [];
        for (const part of userMessage.getParts())
            if (part instanceof Engine.RoleMessage.User.Part.Text)
                contentParts.push({ type: 'text', text: part.text });
            else if (part instanceof Media.Text)
                contentParts.push({ type: 'text', text: part.quote() });

        apiMessages.push({ role: 'user', content: contentParts });
        return apiMessages;
    }

    public encodeAiMessage(
        aiMessage: Engine.RoleMessage.Ai.From<fdm>,
    ): OpenAI.ChatCompletionAssistantMessageParam {
        const parts = aiMessage.getParts();
        const textParts: Engine.RoleMessage.Ai.Part.Text[] = [];
        const fcParts: Function.Call.From<fdm>[] = [];
        for (const part of parts) {
            if (part instanceof Engine.RoleMessage.Ai.Part.Text)
                textParts.push(part);
            else if (part instanceof Function.Call)
                fcParts.push(part as Function.Call.From<fdm>);
        }
        return {
            role: 'assistant',
            content: textParts.length ? textParts.map(part => part.text).join('') : undefined,
            tool_calls: fcParts.length ? fcParts.map(fcall => this.toolCodec.encodeFunctionCall(fcall)) : undefined,
        };
    }

    public encodeRoleMessage(
        roleMessage: Engine.Session.ChatMessage.From<fdm> | Engine.RoleMessage.Developer,
    ): OpenAI.ChatCompletionMessageParam[] {
        if (roleMessage instanceof Engine.RoleMessage.Developer)
            return [this.encodeDeveloperMessage(roleMessage)];
        else if (roleMessage instanceof Engine.RoleMessage.User) {
            const userMessage = roleMessage as Engine.RoleMessage.User.From<fdm>;
            return this.encodeUserMessage(userMessage);
        } else if (roleMessage instanceof Engine.RoleMessage.Ai) {
            const aiMessage = roleMessage as Engine.RoleMessage.Ai.From<fdm>;
            return [this.encodeAiMessage(aiMessage)];
        }
        else throw new Error();
    }

    public encodeRoleMessages(
        chatMessages: (Engine.Session.ChatMessage.From<fdm> | Engine.RoleMessage.Developer)[],
    ): OpenAI.ChatCompletionMessageParam[] {
        return chatMessages.map(chatMessage => this.encodeRoleMessage(chatMessage)).flat();
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
    }
}
