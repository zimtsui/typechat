import { Function } from './function.ts';
import { EndpointSpec } from './endpoint-spec.ts';
import { Throttle } from './throttle.ts';
import { Agent, ProxyAgent, Dispatcher } from 'undici';
import { env } from 'node:process';
import { type InferenceContext } from './inference-context.ts';
import { loggers } from './telemetry.ts';
import * as SessionModule from './engine/session.ts';
import * as MessageModule from './engine/message.ts';
import { Verbatim } from './verbatim.ts';
import { PartsValidator } from './engine/parts-validator.ts';
import { Recoverable } from './engine/recoverable.ts';
import { Middleware } from './engine/middleware.ts';
import * as StructuringValidatorModule from './engine/structuring-validator.ts';
import * as EngineTransportModule from './engine/transport.ts';
import { StructuringChoice } from './structuring-choice.ts';


export interface Pricing {
    inputPrice: number;
    cachePrice: number;
    outputPrice: number;
}
export interface ProviderSpecs {
    baseUrl: string;
    apiKey: string;
    dispatcher: Dispatcher;
    retry: number;
}
export interface InferenceOptions {
    model: string;
    additionalOptions?: Record<string, unknown>;
    parallelToolCall?: boolean;
    timeout?: number;
    retry: number;
}

export type Engine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = Engine.Instance<fdm, vdm>;
export namespace Engine {
    export abstract class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        protected providerSpecs: ProviderSpecs;
        protected inferenceOptions: InferenceOptions;
        public name: string;
        public pricing: Pricing;
        public fdm: fdm;
        public vdm: vdm;
        protected throttle: Throttle;
        protected structuringChoice: StructuringChoice;
        protected structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;
        protected partsValidator: PartsValidator.From<fdm, vdm>;
        protected abstract transport: Engine.Transport<fdm, vdm>;

        public constructor(options: Engine.Options<fdm, vdm>) {
            const proxyUrl = options.endpointSpec.proxy || env.https_proxy || env.HTTPS_PROXY;

            const dispatcher = proxyUrl
                ? new ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 10000,
                    bodyTimeout: 0,
                })
                : new Agent({
                    headersTimeout: 10000,
                    bodyTimeout: 0,
                });
            this.providerSpecs = {
                baseUrl: options.endpointSpec.baseUrl,
                apiKey: options.endpointSpec.apiKey,
                dispatcher,
                retry: options.providerRetry ?? 2,
            };

            this.name = options.endpointSpec.name;
            this.inferenceOptions = {
                model: options.endpointSpec.model,
                additionalOptions: options.endpointSpec.additionalOptions,
                timeout: options.endpointSpec.timeout,
                parallelToolCall: options.endpointSpec.parallelToolCall,
                retry: options.inferenceRetry ?? 2,
            };

            this.pricing = {
                inputPrice: options.endpointSpec.inputPrice ?? 0,
                outputPrice: options.endpointSpec.outputPrice ?? 0,
                cachePrice: options.endpointSpec.cachePrice ?? options.endpointSpec.inputPrice ?? 0,
            };
            this.fdm = options.functionDeclarationMap;
            this.vdm = options.verbatimDeclarationMap;
            this.structuringChoice = options.structuringChoice ?? StructuringChoice.AUTO;
            this.throttle = options.throttle;
            this.partsValidator = new PartsValidator();
            this.structuringValidator = new StructuringValidator({ structuringChoice: this.structuringChoice });
        }

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link Recoverable} 模型抽风但可恢复
        * @throws {@link TypeError} 网络故障
        */
        protected async infer(
            wfctx: InferenceContext,
            session: Session.From<fdm, vdm>,
        ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            const signalTimeout = this.inferenceOptions.timeout ? AbortSignal.timeout(this.inferenceOptions.timeout) : null;
            const signals: AbortSignal[] = [];
            if (signalTimeout) signals.push(signalTimeout);
            if (wfctx.signal) signals.push(wfctx.signal);
            const signal = AbortSignal.any(signals);
            try {
                const aiMessage = await this.transport.fetch(wfctx, session, signal);
                this.partsValidator.validate(aiMessage);
                const rejection = this.structuringValidator.validate(aiMessage);
                if (rejection) throw new Recoverable(aiMessage, rejection);
                return aiMessage;
            } catch (e) {
                if (signalTimeout?.aborted)
                    throw new InferenceTimeout(undefined, { cause: e });
                else throw e;
            }
        }

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link TypeError} 网络故障
        */
        public async stateless(
            wfctx: InferenceContext,
            session: Session.From<fdm, vdm>,
        ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            const middleware = this.compose(this.middlewaresStateless);
            for (let retryProvider = 0, retryInference = 0;;) try {
                return await middleware(wfctx, session, () => this.infer(wfctx, session));
            } catch (e) {
                if (e instanceof InferenceTimeout) {    // 推理超时
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof SyntaxError) {  // 模型抽风
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof TypeError) {    // 网络故障
                    if (retryProvider < this.providerSpecs.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryProvider++;
                } else throw e;
            }
        }

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link TypeError} 网络故障
        * @param session mutable
        */
        public async stateful(
            wfctx: InferenceContext,
            session: Session.From<fdm, vdm>,
        ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            const middleware = this.compose(this.middlewaresStateful);
            for (let retryProvider = 0, retryInference = 0;;) try {
                const next = async () => {
                    const aiMessage = await this.infer(wfctx, session);
                    session.chatMessages.push(aiMessage);
                    return aiMessage;
                }
                return await middleware(wfctx, session, next);
            } catch (e) {
                if (e instanceof InferenceTimeout) {    // 推理超时
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof SyntaxError) {  // 模型抽风
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof TypeError) {    // 网络故障
                    if (retryProvider < this.providerSpecs.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryProvider++;
                } else throw e;
            }
        }

        public abstract clone(): Engine<fdm, vdm>;

        protected middlewaresStateless: Middleware.From<fdm, vdm>[] = [];
        public useStateless(middleware: Middleware.From<fdm, vdm>): Engine<fdm, vdm> {
            const engine = this.clone();
            engine.middlewaresStateless.push(middleware);
            return engine;
        }
        protected middlewaresStateful: Middleware.From<fdm, vdm>[] = [];
        public useStateful(middleware: Middleware.From<fdm, vdm>): Engine<fdm, vdm> {
            const engine = this.clone();
            engine.middlewaresStateful.push(middleware);
            return engine;
        }
        protected compose(middlewares: Middleware.From<fdm, vdm>[]): Middleware.From<fdm, vdm> {
            let composed: Middleware.From<fdm, vdm> = (wfctx, session, next) => next();
            for (const middleware of middlewares.slice().reverse()) {
                const nextMiddleware = composed;
                composed = (wfctx, session, next) => middleware(wfctx, session, () => nextMiddleware(wfctx, session, next));
            }
            return composed;
        }

        /**
         * @param session mutable
         */
        public async *agentloop(
            wfctx: InferenceContext,
            session: Session.From<fdm, vdm>,
            fnm: Function.Map<fdm>,
            vhm: Verbatim.Handler.Map<vdm>,
            limit = Number.POSITIVE_INFINITY,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session);
                if (response.allTextPart()) return response.getText();
                const pfress: Promise<Function.Response.From<fdm>>[] = [];
                const pvress: Promise<RoleMessage.User.Part.Text>[] = [];
                for (const part of response.getParts()) {
                    if (part instanceof RoleMessage.Ai.Part.Text) {
                        yield part.text;
                    } else if (part instanceof Function.Call) {
                        const fcall = part as Function.Call.From<fdm>;
                        const f = fnm[fcall.name];
                        pfress.push((async () => {
                            try {
                                return Function.Response.Successful.of({
                                    id: fcall.id,
                                    name: fcall.name,
                                    text: await f.call(fnm, fcall.args),
                                } as Function.Response.Successful.Options.From<fdm>);
                            } catch (e) {
                                if (e instanceof Function.Error) {} else throw e;
                                return Function.Response.Failed.of({
                                    id: fcall.id,
                                    name: fcall.name,
                                    error: e.message,
                                } as Function.Response.Failed.Options.From<fdm>);
                            }
                        })());
                    } else if (part instanceof Verbatim.Request) {
                        const vreq = part as Verbatim.Request.From<vdm>;
                        const vh = vhm[vreq.name];
                        pvress.push((async () => {
                            return new RoleMessage.User.Part.Text(
                                await vh.call(vhm, vreq.args),
                            );
                        })());
                    } else throw new Error();
                }
                const fress: Function.Response.From<fdm>[] = await Promise.all(pfress);
                const vress: RoleMessage.User.Part.Text[] = await Promise.all(pvress);
                session.chatMessages.push(new RoleMessage.User([...fress, ...vress]))
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }

    }

    export class FunctionCallLimitExceeded extends Error {}

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        throttle: Throttle;
        endpointSpec: EndpointSpec;
        functionDeclarationMap: fdm;
        verbatimDeclarationMap: vdm;
        structuringChoice?: StructuringChoice;
        providerRetry?: number;
        inferenceRetry?: number;
    }

    export import Transport = EngineTransportModule.Transport;
    export import StructuringValidator = StructuringValidatorModule.StructuringValidator;
    export import Session = SessionModule.Session;
    export import RoleMessage = MessageModule.RoleMessage;
}

export class InferenceTimeout extends Error {}

declare global {
    export namespace NodeJS {
        export interface ProcessEnv {
            https_proxy?: string;
        }
    }
}
