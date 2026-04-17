import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import { type InferenceContext } from '../../inference-context.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from '../../api-types/openai-responses/tool-codec.ts';
import type { Billing } from '../../api-types/openai-responses/billing.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as ChoiceCodec from './choice-codec.ts';
import type { Structuring } from '../../compatible-engine/structuring.ts';
import type { Engine } from '../../engine.ts';


export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<
    RoleMessage.User.From<fdm>,
    RoleMessage.Ai.From<fdm, vdm>,
    RoleMessage.Developer,
    Session.From<fdm, vdm>
> {
    protected client: OpenAI;

    public constructor(protected comps: Transport.Components<fdm, vdm>) {
        this.client = new OpenAI({
            baseURL: this.comps.providerSpec.baseUrl,
            apiKey: this.comps.providerSpec.apiKey,
            fetchOptions: {
                dispatcher: this.comps.providerSpec.dispatcher,
            },
        });
    }

    protected makeParams(
        session: Session.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const tools = this.comps.toolCodec.encodeFunctionDeclarationMap(this.comps.fdm);
        return {
            model: this.comps.inferenceParams.model,
            include: ['reasoning.encrypted_content'],
            store: false,
            stream: true,
            input: session.chatMessages.flatMap(chatMessage => this.comps.messageCodec.encodeChatMessage(chatMessage)),
            instructions: session.developerMessage && this.comps.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.comps.choice) : undefined,
            parallel_tool_calls: tools.length ? this.comps.inferenceParams.parallelToolCall : undefined,
            ...this.comps.inferenceParams.additionalOptions,
        };
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
        await this.comps.throttle.requests(wfctx);

        // Prepare request
        const params = this.makeParams(session);
        loggers.message.debug(params);

        // Send request
        let response: OpenAI.Responses.Response | null = null;
        const stream = await this.client.responses.create(params, { signal });
        for await (const event of stream) {
            loggers.stream.trace(event);
            if (event.type === 'response.completed')
                response = event.response;
            else if (event.type === 'response.incomplete')
                response = event.response;
        }

        // Validate response
        if (response) {} else throw new Error();
        loggers.message.debug(response);
        if (response.status === 'completed') {} else
            throw new SyntaxError('Abnormal response status', { cause: response });
        if (response.usage) {} else throw new Error();

        // Log response
        for (const item of response.output)
            if (item.type === 'message')
                for (const part of item.content)
                    if (part.type === 'output_text')
                        loggers.inference.info(part.text);
                    else if (part.type === 'refusal')
                        loggers.inference.warn(part.refusal);
            else loggers.message.info(item);
        loggers.message.info(response.usage);
        wfctx.cost?.(this.comps.billing.charge(response.usage));

        return this.comps.messageCodec.decodeAiMessage(response.output);
    }
}

export namespace Transport {
    export interface Components<
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
