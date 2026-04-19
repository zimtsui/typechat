import { RoleMessage, type Session } from './session.ts';
import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { MessageCodec as CompatibleMessageCodec } from '../../compatible-engine.d/google/message-codec.ts';
import type { ToolCodec } from '../../api-types/google/tool-codec.ts';
import { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';



export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    protected compatibleMessageCodec: CompatibleMessageCodec<fdm, vdm>;
    protected codeExecution: boolean;
    protected vdm: vdm;
    public constructor(options: MessageCodec.Options<fdm, vdm>) {
        this.toolCodec = options.toolCodec;
        this.compatibleMessageCodec = options.compatibleMessageCodec;
        this.codeExecution = options.codeExecution;
        this.vdm = options.vdm;
    }


    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): Google.Content {
        return aiMessage.getRaw();
    }

    public encodeUserMessage(
        userMessage: RoleMessage.User.From<fdm>,
    ): Google.Content {
        return this.compatibleMessageCodec.encodeUserMessage(userMessage);
    }

    public encodeDeveloperMessage(
        developerMessage: RoleMessage.Developer,
    ): Google.Content {
        return this.compatibleMessageCodec.encodeDeveloperMessage(developerMessage);
    }

    public encodeChatMessages(
        chatMessages: Session.ChatMessage.From<fdm, vdm>[],
    ): Google.Content[] {
        return chatMessages.map(
            chatMessage => {
                if (chatMessage instanceof RoleMessage.User) return this.encodeUserMessage(chatMessage);
                else if (chatMessage instanceof RoleMessage.Ai) return this.encodeAiMessage(chatMessage);
                else throw new Error();
            },
        );
    }

    public decodeAiMessage(
        content: Google.Content,
    ): RoleMessage.Ai.From<fdm, vdm> {
        if (content.parts) {} else throw new Error();
        const parts: RoleMessage.Ai.Part.From<fdm, vdm>[] = [];
        for (const part of content.parts) {
            if (part.text) {
                const vrs = VerbatimCodec.Request.decode(part.text, this.vdm);
                parts.push(new RoleMessage.Part.Text(part.text, vrs));
            }
            if (part.functionCall)
                parts.push(this.toolCodec.decodeFunctionCall(part.functionCall));
            if (part.executableCode) {
                if (this.codeExecution) {} else throw new SyntaxError('Unexpected code execution', { cause: content });
                if (part.executableCode.code) {} else throw new Error();
                if (part.executableCode.language) {} else throw new Error();
                parts.push(new RoleMessage.Ai.Part.ExecutableCode(part.executableCode.code, part.executableCode.language));
            }
            if (part.codeExecutionResult) {
                if (this.codeExecution) {} else throw new SyntaxError('Unexpected code execution result', { cause: content });
                if (part.codeExecutionResult.outcome) {} else throw new Error();
                parts.push(new RoleMessage.Ai.Part.CodeExecutionResult(part.codeExecutionResult.outcome, part.codeExecutionResult.output));
            }
        }
        return new RoleMessage.Ai(parts, content);
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        compatibleMessageCodec: CompatibleMessageCodec<fdm, vdm>;
        codeExecution: boolean;
        vdm: vdm;
    }
}
