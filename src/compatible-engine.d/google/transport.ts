import { Engine, type InferenceParams as InferenceParams, type ProviderSpec } from '../../engine.ts';
import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
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
import type { Structuring } from '../../compatible-engine/structuring.ts';
import * as ChoiceCodec from './choice-codec.ts';
import { MIMEType } from 'whatwg-mimetype';



export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<
    RoleMessage.User.From<fdm>,
    RoleMessage.Ai.From<fdm, vdm>,
    RoleMessage.Developer,
    Session.From<fdm, vdm>
> {
    protected apiURL: URL;
    public constructor(protected options: Transport.Options<fdm, vdm>) {
        this.apiURL = new URL(`${this.options.providerSpec.baseUrl}/v1beta/models/${this.options.inferenceParams.model}:generateContent`)
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
        await this.options.throttle.requests(wfctx);

        // Prepare request body
        const systemInstruction = session.developerMessage && this.options.messageCodec.encodeDeveloperMessage(session.developerMessage);
        const contents = this.options.messageCodec.encodeChatMessages(session.chatMessages);
        const apiFds = this.options.toolCodec.encodeFunctionDeclarationMap(this.options.fdm);
        const apiTools: Google.Tool[] = [];
        if (apiFds.length) apiTools.push({ functionDeclarations: apiFds });
        const apiToolConfig: Google.ToolConfig = {};
        if (apiFds.length) apiToolConfig.functionCallingConfig = ChoiceCodec.encode(this.options.choice);
        const reqbody: RestfulRequest = {
            contents,
            tools: apiTools,
            toolConfig: apiToolConfig,
            systemInstruction,
            generationConfig: this.options.inferenceParams.additionalOptions,
        };
        loggers.message.debug(reqbody);

        // Send request
        const res = await Undici.fetch(
            this.apiURL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.options.providerSpec.apiKey,
                },
                body: JSON.stringify(reqbody),
                dispatcher: this.options.providerSpec.dispatcher,
                signal,
            },
        );

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
        wfctx.cost?.(this.options.billing.charge(response.usageMetadata));

        return this.options.messageCodec.decodeAiMessage(response.candidates[0].content);
    }

}

export namespace Transport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        inferenceParams: InferenceParams;
        providerSpec: ProviderSpec;
        fdm: fdm;
        throttle: Throttle;
        choice: Structuring.Choice.From<fdm, vdm>;

        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
