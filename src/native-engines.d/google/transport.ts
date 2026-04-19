import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { RoleMessage, type Session } from './session.ts';
import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import * as Undici from 'undici';
import { type InferenceContext } from '../../inference-context.ts';
import type { RestfulRequest } from '../../api-types/google/restful-request.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from '../../api-types/google/tool-codec.ts';
import type { Billing } from '../../api-types/google/billing.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as ChoiceCodec from '../../compatible-engine.d/google/choice-codec.ts';
import type { Structuring } from '../../compatible-engine/structuring.ts';
import type { Engine } from '../../engine.ts';
import { MIMEType } from 'whatwg-mimetype';
import { HeaderRecord } from 'undici/types/header';



export class GoogleNativeTransport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<
    RoleMessage.User.From<fdm>,
    RoleMessage.Ai.From<fdm, vdm>,
    RoleMessage.Developer,
    Session.From<fdm, vdm>
> {
    protected apiURL: URL;

    public constructor(protected options: GoogleNativeTransport.Options<fdm, vdm>) {
        this.apiURL = new URL(`${this.options.providerSpec.baseUrl}/v1beta/models/${this.options.inferenceParams.model}:generateContent`);
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
        const systemInstruction = session.developerMessage && this.options.messageCodec.encodeDeveloperMessage(session.developerMessage);
        const contents = this.options.messageCodec.encodeChatMessages(session.chatMessages);

        await this.options.throttle.requests(wfctx);

        const apifds = this.options.toolCodec.encodeFunctionDeclarationMap(this.options.fdm);
        const apiTools: Google.Tool[] = [];
        if (apifds.length) apiTools.push({ functionDeclarations: apifds });
        if (this.options.urlContext) apiTools.push({ urlContext: {} });
        if (this.options.googleSearch) apiTools.push({ googleSearch: {} });
        if (this.options.codeExecution) apiTools.push({ codeExecution: {} });
        const apiToolConfig: Google.ToolConfig = {};
        if (apifds.length) apiToolConfig.functionCallingConfig = ChoiceCodec.encode(this.options.choice);
        const reqbody: RestfulRequest = {
            contents,
            tools: apiTools.length ? apiTools : undefined,
            toolConfig: apiToolConfig,
            systemInstruction,
            generationConfig: this.options.inferenceParams.additionalOptions,
        };

        loggers.message.debug(reqbody);

        const res = await Undici.fetch(
            this.apiURL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.options.providerSpec.apiKey,
                } satisfies HeaderRecord,
                body: JSON.stringify(reqbody),
                dispatcher: this.options.providerSpec.dispatcher,
                signal,
            },
        );
        loggers.message.debug(res);
        if (res.ok) {} else {
            const contentType = res.headers.get('Content-Type');
            if (contentType) {} else throw new Error(res.statusText, { cause: res });
            const mimeType = new MIMEType(contentType);
            if (mimeType.essence === 'application/json')
                throw new Error(res.statusText, { cause: await res.json() });
            else if (mimeType.type === 'text')
                throw new Error(res.statusText, { cause: await res.text() });
            else throw new Error(res.statusText, { cause: res });
        }
        const response = await res.json() as Google.GenerateContentResponse;

        if (response.candidates?.[0]?.content?.parts?.length) {} else
            throw new SyntaxError('Content missing', { cause: response });
        if (response.candidates[0].finishReason === Google.FinishReason.MAX_TOKENS)
            throw new SyntaxError('Token limit exceeded.', { cause: response });
        if (response.candidates[0].finishReason === Google.FinishReason.STOP) {} else
            throw new SyntaxError('Abnormal finish reason', { cause: response });

        for (const part of response.candidates[0].content.parts) {
            if (part.text) loggers.inference.info(part.text);
            if (part.functionCall) loggers.message.info(part.functionCall);
        }

        if (response.usageMetadata) {} else throw new SyntaxError('Usage metadata missing', { cause: response });
        wfctx.cost?.(this.options.billing.charge(response.usageMetadata));

        return this.options.messageCodec.decodeAiMessage(response.candidates[0].content);
    }
}

export namespace GoogleNativeTransport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        inferenceParams: InferenceParams;
        providerSpec: ProviderSpec;
        fdm: fdm;
        throttle: Throttle;
        choice: Structuring.Choice.From<fdm, vdm>;
        codeExecution: boolean;
        urlContext: boolean;
        googleSearch: boolean;

        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
