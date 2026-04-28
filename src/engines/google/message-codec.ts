import { type Session } from '../../session.ts';
import { NativeRoleMessage } from './message.ts';
import { RoleMessage } from '../../message.ts';
import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { type ToolCodec } from './tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { Media } from '../../media.ts';



export class MessageCodec<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    protected vdm: vdm;
    protected codeExecution: boolean;
    public constructor(options: MessageCodec.Options<fdm, vdm>) {
        this.toolCodec = options.toolCodec;
        this.vdm = options.vdm;
        this.codeExecution = options.codeExecution;
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): Google.Content {
        if (aiMessage instanceof NativeRoleMessage.Ai) {
            const nativeMessage = aiMessage as NativeRoleMessage.Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
            return nativeMessage.getRaw();
        }
        else {
            const apiParts: Google.PartUnion[] = [];
            for (const part of aiMessage.getParts()) {
                if (part instanceof NativeRoleMessage.Ai.Part.Text) {
                    const textPart = part as NativeRoleMessage.Ai.Part.Text.From<vdm>;
                    apiParts.push(
                        Google.createPartFromText(textPart.text),
                    );
                } else if (part instanceof Function.Call) {
                    const fc = part as Function.Call.From<fdm>;
                    if (fc.args instanceof Object) {} else throw new Error();
                    apiParts.push(
                        Google.createPartFromFunctionCall(
                            fc.name,
                            fc.args satisfies Record<string, unknown>,
                        ),
                    );
                } else throw new Error('Unknown AI message part type', { cause: part });
            }
            return Google.createModelContent(apiParts);
        }
    }

    public encodeChatMessages(
        chatMessages: Session.ChatMessage.From<fdm, vdm>[],
    ): Google.Content[] {
        return chatMessages.map(chatMessage => {
            if (chatMessage instanceof RoleMessage.User) {
                const userMessage = chatMessage as RoleMessage.User.From<fdm>;
                return this.encodeUserMessage(userMessage);
            } else if (chatMessage instanceof RoleMessage.Ai) {
                const aiMessage = chatMessage as RoleMessage.Ai.From<fdm, vdm>;
                return this.encodeAiMessage(aiMessage);
            }
            else throw new Error();
        });
    }

    public encodeUserMessage(
        userMessage: RoleMessage.User.From<fdm>,
    ): Google.Content {
        const apiParts: Google.PartUnion[] = [];
        for (const part of userMessage.getParts()) {
            if (part instanceof RoleMessage.User.Part.Text)
                apiParts.push(Google.createPartFromText(part.text));
            else if (part instanceof Function.Response) {
                const fr = part as Function.Response.From<fdm>;
                apiParts.push(this.toolCodec.encodeFunctionResponse(fr));
            }
            else if (part instanceof Media.Pdf)
                apiParts.push(
                    Google.createPartFromBase64(
                        part.base64, `${part.mimeType}`,
                        Google.PartMediaResolutionLevel.MEDIA_RESOLUTION_MEDIUM,
                    ),
                );
            else throw new Error('Unknown user message part type', { cause: part });
        };
        return Google.createUserContent(apiParts);
    }

    public encodeDeveloperMessage(
        developerMessage: RoleMessage.Developer,
    ): Google.Content {
        const parts = developerMessage.getOnlyTextParts().map(part => Google.createPartFromText(part.text));
        return { parts };
    }

    public decodeAiMessage(
        content: Google.Content,
    ): NativeRoleMessage.Ai.From<fdm, vdm> {
        if (content.parts) {} else throw new Error();
        const parts: unknown[] = [];
        for (const part of content.parts) {
            if (part.text) {
                const vrs = VerbatimCodec.Request.decode(part.text, this.vdm);
                parts.push(new RoleMessage.Ai.Part.Text(part.text, vrs));
            }
            if (part.functionCall)
                parts.push(this.toolCodec.decodeFunctionCall(part.functionCall));
            if (part.executableCode) {
                if (this.codeExecution) {} else throw new SyntaxError('Unexpected code execution', { cause: content });
                if (part.executableCode.code) {} else throw new Error();
                if (part.executableCode.language) {} else throw new Error();
                parts.push(new NativeRoleMessage.Ai.Part.ExecutableCode(part.executableCode.code, part.executableCode.language));
            }
            if (part.codeExecutionResult) {
                if (this.codeExecution) {} else throw new SyntaxError('Unexpected code execution result', { cause: content });
                if (part.codeExecutionResult.outcome) {} else throw new Error();
                parts.push(new NativeRoleMessage.Ai.Part.CodeExecutionResult(part.codeExecutionResult.outcome, part.codeExecutionResult.output));
            }
        }
        return new NativeRoleMessage.Ai(parts, content);
    }
}


export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        vdm: vdm;
        codeExecution: boolean;
    }

}
