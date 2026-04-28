import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { type Session } from '../../session.ts';
import { NativeRoleMessage } from './message.ts';
import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import * as Undici from 'undici';
import { type InferenceContext } from '../../inference-context.ts';
import type { RestfulRequest } from './restful-request.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from './tool-codec.ts';
import type { Billing } from './billing.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as ChoiceCodec from './choice-codec.ts';
import type { StructuringChoice } from '../../engine/structuring-choice.ts';
import type { Engine } from '../../engine.ts';
import { MIMEType } from 'whatwg-mimetype';
import { HeaderRecord } from 'undici/types/header';



export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<fdm, vdm> {
    protected apiURL: URL;
    protected inferenceParams: InferenceParams;
    protected providerSpec: ProviderSpec;
    protected fdm: fdm;
    protected throttle: Throttle;
    protected structuringChoice: StructuringChoice.From<fdm, vdm>;
    protected codeExecution: boolean;
    protected urlContext: boolean;
    protected googleSearch: boolean;
    protected messageCodec: MessageCodec<fdm, vdm>;
    protected toolCodec: ToolCodec<fdm>;
    protected billing: Billing;

    public constructor(options: GoogleNativeTransport.Options<fdm, vdm>) {
        this.apiURL = new URL(`${options.providerSpec.baseUrl}/v1beta/models/${options.inferenceParams.model}:generateContent`);
        this.inferenceParams = options.inferenceParams;
        this.providerSpec = options.providerSpec;
        this.fdm = options.fdm;
        this.throttle = options.throttle;
        this.structuringChoice = options.structuringChoice;
        this.codeExecution = options.codeExecution;
        this.urlContext = options.urlContext;
        this.googleSearch = options.googleSearch;
        this.messageCodec = options.messageCodec;
        this.toolCodec = options.toolCodec;
        this.billing = options.billing;
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<NativeRoleMessage.Ai.From<fdm, vdm>> {
        await this.throttle.requests(wfctx);

        // Prepare request body
        const systemInstruction = session.developerMessage && this.messageCodec.encodeDeveloperMessage(session.developerMessage);
        const contents = this.messageCodec.encodeChatMessages(session.chatMessages);
        const apiFds = this.toolCodec.encodeFunctionDeclarationMap();
        const apiTools: Google.Tool[] = [];
        if (apiFds.length) apiTools.push({ functionDeclarations: apiFds });
        if (this.urlContext) apiTools.push({ urlContext: {} });
        if (this.googleSearch) apiTools.push({ googleSearch: {} });
        if (this.codeExecution) apiTools.push({ codeExecution: {} });
        const apiToolConfig: Google.ToolConfig = {};
        if (apiFds.length) apiToolConfig.functionCallingConfig = ChoiceCodec.encode(this.structuringChoice);
        const reqbody: RestfulRequest = {
            contents,
            tools: apiTools.length ? apiTools : undefined,
            toolConfig: apiToolConfig,
            systemInstruction,
            generationConfig: this.inferenceParams.additionalOptions,
        };
        loggers.message.debug(reqbody);

        // Send request
        const res = await Undici.fetch(
            this.apiURL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.providerSpec.apiKey,
                } satisfies HeaderRecord,
                body: JSON.stringify(reqbody),
                dispatcher: this.providerSpec.dispatcher,
                signal,
            },
        );
        loggers.message.debug(res);

        // Get response
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
        loggers.message.debug(response);

        // Validate response
        if (response.candidates?.[0]?.content?.parts?.length) {} else
            throw new SyntaxError('Content missing', { cause: response });
        if (response.candidates[0].finishReason === Google.FinishReason.MAX_TOKENS)
            throw new SyntaxError('Token limit exceeded.', { cause: response });
        if (response.candidates[0].finishReason === Google.FinishReason.STOP) {} else
            throw new SyntaxError('Abnormal finish reason', { cause: response });
        if (response.usageMetadata) {} else
            throw new SyntaxError('Usage metadata missing', { cause: response });
        for (const part of response.candidates[0].content.parts) {
            if (part.text) loggers.inference.info(part.text);
            if (part.functionCall) loggers.message.info(part.functionCall);
        }
        wfctx.cost?.(this.billing.charge(response.usageMetadata));

        return this.messageCodec.decodeAiMessage(response.candidates[0].content);
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
        structuringChoice: StructuringChoice.From<fdm, vdm>;
        codeExecution: boolean;
        urlContext: boolean;
        googleSearch: boolean;
        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
