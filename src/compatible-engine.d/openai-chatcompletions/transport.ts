import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { InferenceContext } from '../../inference-context.ts';
import type { Verbatim } from '../../verbatim.ts';
import type { Engine } from '../../engine.ts';
import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { loggers } from '../../telemetry.ts';
import type { Billing } from '../../api-types/openai-chatcompletions/billing.ts';
import type { ToolCodec } from '../../api-types/openai-chatcompletions/tool-codec.ts';
import { Throttle } from '../../throttle.ts';
import { type MessageCodec } from './message-codec.ts';
import type { Structuring } from '../../compatible-engine/structuring.ts';
import * as ChoiceCodec from './choice-codec.ts';



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
            fetchOptions: { dispatcher: this.comps.providerSpec.dispatcher },
        })
    }

    protected makeParams(
        session: Session.From<fdm, vdm>,
    ): OpenAI.ChatCompletionCreateParamsStreaming {
        const tools = this.comps.toolCodec.encodeFunctionDeclarationMap(this.comps.fdm);
        const messages: OpenAI.ChatCompletionMessageParam[] = [];
        if (session.developerMessage) messages.push(...this.comps.messageCodec.encodeRoleMessage(session.developerMessage));
        messages.push(...this.comps.messageCodec.encodeRoleMessages(session.chatMessages));
        return {
            model: this.comps.inferenceParams.model,
            messages,
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.comps.choice) : undefined,
            parallel_tool_calls: tools.length ? this.comps.inferenceParams.parallelToolCall : undefined,
            stream: true,
            stream_options: {
                include_usage: true,
            },
            ...this.comps.inferenceParams.additionalOptions,
        };
    }

    public mergeToolCall(
        apifc: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall,
    ) {
        if (apifc.id) {} else throw new Error();
        if (apifc.function?.name) {} else throw new Error();
        if (apifc.function?.arguments) {} else throw new Error();
        return apifc as OpenAI.ChatCompletionMessageFunctionToolCall;
    }

    public mergeCompletion(
        stock: OpenAI.ChatCompletionChunk,
    ): OpenAI.ChatCompletion {
        const stockChoice = stock?.choices[0];
        if (stockChoice?.finish_reason) {} else throw new SyntaxError('Finish reason missing', { cause: stock });

        const completion: OpenAI.ChatCompletion = {
            id: stock.id,
            object: 'chat.completion',
            created: stock.created,
            model: stock.model,
            choices: [{
                index: 0,
                finish_reason: stockChoice.finish_reason,
                message: {
                    role: 'assistant',
                    content: stockChoice.delta.content ?? null,
                    tool_calls: stockChoice.delta.tool_calls?.map(
                        apifc => this.mergeToolCall(apifc),
                    ),
                    refusal: stockChoice.delta.refusal ?? null,
                },
                logprobs: stockChoice.logprobs ?? null,
            }],
            usage: stock.usage ?? undefined,
        };
        return completion;
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
        try {
            await this.comps.throttle.requests(wfctx);

            // Prepare request
            const params = this.makeParams(session);
            loggers.message.debug(params);

            // Send request
            const stream = await this.client.chat.completions.create(
                params,
                {
                    signal,
                    fetchOptions: {
                        dispatcher: this.comps.providerSpec.dispatcher,
                    }
                },
            );

            // Get response
            let stock: OpenAI.ChatCompletionChunk | null = null;
            for await (const chunk of stream) {
                stock ??= {
                    id: chunk.id,
                    created: chunk.created,
                    model: chunk.model,
                    choices: [],
                    object: 'chat.completion.chunk',
                };

                // choice
                const deltaChoice = chunk.choices[0];
                if (deltaChoice) {
                    if (!stock.choices.length)
                        stock.choices.push({
                            index: 0,
                            finish_reason: null,
                            delta: {},
                        });

                    // content
                    if (deltaChoice.delta.content) {
                        stock.choices[0]!.delta.content ??= '';
                        stock.choices[0]!.delta.content! += deltaChoice.delta.content;
                    }

                    // function calls
                    if (deltaChoice.delta.tool_calls) {
                        stock.choices[0]!.delta.tool_calls ??= [];
                        for (const deltaToolCall of deltaChoice.delta.tool_calls) {
                            const toolCalls = stock.choices[0]!.delta.tool_calls!;
                            toolCalls[deltaToolCall.index] ??= { index: deltaToolCall.index };
                            toolCalls[deltaToolCall.index]!.id ??= deltaToolCall.id;
                            if (deltaToolCall.function) {
                                toolCalls[deltaToolCall.index]!.function ??= {};
                                toolCalls[deltaToolCall.index]!.function!.name ??= deltaToolCall.function.name;
                                if (deltaToolCall.function.arguments) {
                                    toolCalls[deltaToolCall.index]!.function!.arguments ??= '';
                                    toolCalls[deltaToolCall.index]!.function!.arguments! += deltaToolCall.function?.arguments || '';
                                }
                            }
                        }
                    }

                    // finish reason
                    stock.choices[0]!.finish_reason ??= deltaChoice.finish_reason;
                }

                // usage
                stock.usage ??= chunk.usage;
            }

            // Validate response
            if (stock) {} else throw new Error();
            const completion = this.mergeCompletion(stock);

            const choice = completion.choices[0];
            if (choice) {} else throw new SyntaxError('Content missing', { cause: completion });
            if (choice.message.content) loggers.inference.info(choice.message.content);

            if (choice.finish_reason === 'length') throw new SyntaxError('Token limit exceeded.', { cause: completion });
            if (['stop', 'tool_calls'].includes(choice.finish_reason)) {}
            else throw new SyntaxError('Abnormal finish reason', { cause: choice.finish_reason });

            if (completion.usage) {} else throw new Error();
            const cost = this.comps.billing.charge(completion.usage);

            if (choice.message.tool_calls) loggers.message.info(choice.message.tool_calls);
            loggers.message.info(completion.usage);
            wfctx.cost?.(cost);

            return this.comps.messageCodec.decodeAiMessage(choice.message);
        } catch (e) {
            if (e instanceof OpenAI.InternalServerError)
                throw new TypeError('OpenAI internal server error', { cause: e });
            else if (e instanceof OpenAI.APIConnectionError)
                throw new TypeError('OpenAI API connection error', { cause: e });
            else throw e;
        }
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
