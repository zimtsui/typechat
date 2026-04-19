import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { RoleMessage, type Session } from './session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import * as Undici from 'undici';
import { type InferenceContext } from '../../inference-context.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from '../../api-types/openai-responses/tool-codec.ts';
import type { Billing } from '../../api-types/openai-responses/billing.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as ChoiceCodec from './choice-codec.ts';
import { Structuring } from './structuring.ts';



export class Transport<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> {
    protected client: OpenAI;

    public constructor(protected options: Transport.Options<fdm, vdm>) {
        this.client = new OpenAI({
            baseURL: this.options.providerSpec.baseUrl,
            apiKey: this.options.providerSpec.apiKey,
            fetchOptions: {
                dispatcher: this.options.providerSpec.dispatcher,
            },
        });
    }

    protected makeParams(
        session: Session.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const tools: OpenAI.Responses.Tool[] = this.options.toolCodec.encodeFunctionDeclarationMap(this.options.fdm);
        if (this.options.applyPatch) tools.push({ type: 'apply_patch' });
        return {
            model: this.options.inferenceParams.model,
            include: ['reasoning.encrypted_content'],
            store: false,
            stream: true,
            input: session.chatMessages.flatMap(chatMessage => this.options.messageCodec.encodeChatMessage(chatMessage)),
            instructions: session.developerMessage && this.options.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.options.choice) : undefined,
            parallel_tool_calls: tools.length ? this.options.inferenceParams.parallelToolCall : undefined,
            ...this.options.inferenceParams.additionalOptions,
        };
    }

    protected logAiMessage(output: OpenAI.Responses.ResponseOutputItem[]): void {
        for (const item of output)
            if (item.type === 'message') {
                if (item.content.every(part => part.type === 'output_text')) {} else
                    throw new SyntaxError('Refusal', { cause: output });
                loggers.inference.info(item.content.map(part => part.text).join(''));
            } else if (item.type === 'function_call')
                loggers.message.info(item);
            else if (item.type === 'apply_patch_call')
                loggers.message.info(item);
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
        await this.options.throttle.requests(wfctx);

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
            else if (event.type === 'error')
                throw new SyntaxError(event.message, { cause: event });
        }

        // Validate response
        if (response) {} else throw new Error();
        loggers.message.debug(response);
        if (response.status === 'completed') {} else
            throw new SyntaxError('Abnormal response status', { cause: response });
        if (response.usage) {} else throw new Error();

        this.logAiMessage(response.output);
        wfctx.cost?.(this.options.billing.charge(response.usage));
        loggers.message.info(response.usage);

        return this.options.messageCodec.decodeAiMessage(response.output);
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
        applyPatch: boolean;

        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
