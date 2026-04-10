import { Function } from './function.ts';
import { EndpointSpec } from './endpoint-spec.ts';
import { Throttle } from './throttle.ts';
import { Agent, ProxyAgent, Dispatcher } from 'undici';
import { env } from 'node:process';
import { type InferenceContext } from './inference-context.ts';
import { loggers } from './telemetry.ts';
import * as SessionModule from './engine/session.ts';
import { Verbatim } from "./verbatim.js";
import * as ValidationModule from './engine/validation.ts';
import * as TransportModule from './engine/transport.ts';


export interface Pricing {
    inputPrice: number;
    cachePrice: number;
    outputPrice: number;
}
export interface ProviderSpec {
    baseUrl: string;
    apiKey: string;
    dispatcher: Dispatcher;
}
export interface InferenceParams {
    model: string;
    additionalOptions?: Record<string, unknown>;
    parallelToolCall?: boolean;
    timeout?: number;
    retry: number;
}

export type Engine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
    userm, aim, devm,
    session extends Engine.Session<userm, aim, devm>,
> = Engine.Instance<fdm, vdm, userm, aim, devm, session>;
export namespace Engine {
    export abstract class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
        in out userm, in out aim, in out devm,
        in out session extends Engine.Session<userm, aim, devm>,
    > {
        protected providerSpec: ProviderSpec;
        protected inferenceParams: InferenceParams;
        public name: string;
        public pricing: Pricing;
        public fdm: fdm;
        public vdm: vdm;
        protected throttle: Throttle;
        protected abstract structuringValidator: Engine.StructuringValidator.From<userm, aim>;
        protected abstract partsValidator: Engine.PartsValidator.From<userm, aim>;
        protected abstract transport: Engine.Transport<userm, aim, devm, session>;

        public constructor(options: Engine.Options<fdm, vdm>) {
            const proxyUrl = options.proxy || env.https_proxy || env.HTTPS_PROXY;

            const dispatcher = proxyUrl
                ? new ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 0,
                    bodyTimeout: 0,
                })
                : new Agent({
                    headersTimeout: 0,
                    bodyTimeout: 0,
                });
            this.providerSpec = {
                baseUrl: options.baseUrl,
                apiKey: options.apiKey,
                dispatcher,
            };

            this.name = options.name;
            this.inferenceParams = {
                model: options.model,
                additionalOptions: options.additionalOptions,
                timeout: options.timeout,
                parallelToolCall: options.parallelToolCall,
                retry: options.retry ?? 3,
            };

            this.pricing = {
                inputPrice: options.inputPrice ?? 0,
                outputPrice: options.outputPrice ?? 0,
                cachePrice: options.cachePrice ?? options.inputPrice ?? 0,
            };
            this.fdm = options.functionDeclarationMap;
            this.vdm = options.verbatimDeclarationMap;
            this.throttle = options.throttle;
        }

        protected async infer(
            wfctx: InferenceContext,
            session: session,
            signal?: AbortSignal,
        ): Promise<aim> {
            const aiMessage = await this.transport.fetch(wfctx, session, signal);
            this.partsValidator.validate(aiMessage);
            return aiMessage;
        }

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link ResponseInvalid} 模型抽风
        * @throws {@link NetworkError} 网络故障
        * @throws {@link CustomRetry} 自定义重试
        */
        public async stateless(
            wfctx: InferenceContext,
            session: session,
            validate: (response: aim) => Promise<boolean> = () => Promise.resolve(true),
        ): Promise<aim> {
            for (let retry = 0;; retry++) {
                const signalTimeout = this.inferenceParams.timeout ? AbortSignal.timeout(this.inferenceParams.timeout) : undefined;
                const signals: AbortSignal[] = [];
                if (signalTimeout) signals.push(signalTimeout);
                if (wfctx.signal) signals.push(wfctx.signal);
                const signal = AbortSignal.any(signals);
                try {
                    const response = await this.infer(wfctx, session, signal);
                    const rejection = this.structuringValidator.validate(response);
                    if (rejection) throw new ResponseInvalid.Recoverable();
                    if (await validate(response)) {} else throw new CustomRetry(undefined, { cause: response });
                    return response;
                } catch (e) {
                    if (signalTimeout?.aborted) e = new InferenceTimeout(undefined, { cause: e });      // 推理超时
                    else if (e instanceof ResponseInvalid) {}			                                // 模型抽风
                    else if (e instanceof NetworkError) {}         		                                // 网络故障
                    else if (e instanceof CustomRetry) {}         		                                // 自定义重试
                    else throw e;
                    if (retry < this.inferenceParams.retry) loggers.message.warn(e); else throw e;
                }
            }
        }

        /**
        * @param session mutable
        */
        public async stateful(
            wfctx: InferenceContext,
            session: session,
            validate: (response: aim) => Promise<boolean> = () => Promise.resolve(true),
        ): Promise<aim> {
            for (let retry = 0;; retry++) {
                const signalTimeout = this.inferenceParams.timeout ? AbortSignal.timeout(this.inferenceParams.timeout) : undefined;
                const signals: AbortSignal[] = [];
                if (signalTimeout) signals.push(signalTimeout);
                if (wfctx.signal) signals.push(wfctx.signal);
                const signal = AbortSignal.any(signals);
                try {
                    const response = await this.infer(wfctx, session, signal);
                    const rejection = this.structuringValidator.validate(response);
                    if (rejection) {
                        session.chatMessages.push(response, rejection);
                        throw new ResponseInvalid.Recoverable();
                    }
                    if (await validate(response)) {} else throw new CustomRetry(undefined, { cause: response });
                    session.chatMessages.push(response);
                    return response;
                } catch (e) {
                    if (signalTimeout?.aborted) e = new InferenceTimeout(undefined, { cause: e });      // 推理超时
                    else if (e instanceof ResponseInvalid) {}			                                // 模型抽风
                    else if (e instanceof NetworkError) {}         		                                // 网络故障
                    else if (e instanceof CustomRetry) {}         		                                // 自定义重试
                    else throw e;
                    if (retry < this.inferenceParams.retry) {} else throw e;
                    loggers.message.warn(e);
                }
            }
        }

        public abstract appendUserMessage(
            session: session,
            message: userm,
        ): session;

        /**
        * @param session mutable
        */
        public abstract pushUserMessage(
            session: session,
            message: userm,
        ): session;
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends EndpointSpec {
        throttle: Throttle;
        functionDeclarationMap: fdm;
        verbatimDeclarationMap: vdm;
        parallelToolCall?: boolean;
        retry?: number;
    }


    export import Session = SessionModule.Session;
    export import StructuringValidator = ValidationModule.StructuringValidator;
    export import PartsValidator = ValidationModule.PartsValidator;
    export import Transport = TransportModule.Transport;
}

export class InferenceTimeout extends Error {}
export class NetworkError extends Error {}
export class CustomRetry extends Error {}
export class ResponseInvalid extends Error {}
export namespace ResponseInvalid {
    export class Recoverable extends ResponseInvalid {}
}


declare global {
    export namespace NodeJS {
        export interface ProcessEnv {
            https_proxy?: string;
        }
    }
}
