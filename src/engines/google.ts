import { Engine, Middleware } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './google/message-codec.ts';
import { ToolCodec } from './google/tool-codec.ts';
import { Billing } from './google/billing.ts';
import { env } from 'node:process';
import { Agent, ProxyAgent } from 'undici';
import { ToolChoiceValidator } from '../engine/tool-choice-validator.ts';
import * as TransportModule from './google/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import * as MessageModule from './google/message.ts';
import { Media } from '../media.ts';


export type GoogleEngine<
    fdm extends Function.Decl.Map.Proto,
> = GoogleEngine.Instance<fdm>;
export namespace GoogleEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;
        protected override toolChoiceValidator: Engine.ToolChoiceValidator.From<fdm>;
        protected codeExecution: boolean;
        protected urlContext: boolean;
        protected googleSearch: boolean;

        public constructor(protected options: GoogleEngine.Options<fdm>) {
            super(options);

            this.codeExecution = options.codeExecution ?? false;
            this.urlContext = options.urlContext ?? false;
            this.googleSearch = options.googleSearch ?? false;

            const proxyUrl = options.endpointSpec.proxy || env.https_proxy || env.HTTPS_PROXY;
            this.providerSpecs.dispatcher = proxyUrl
                ? new ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 0,
                    bodyTimeout: 0,
                })
                : new Agent({
                    headersTimeout: 0,
                    bodyTimeout: 0,
                });

            if (options.endpointSpec.parallelToolCall === false) throw new Error('Parallel tool calling is required by Google engine.');
            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                codeExecution: this.codeExecution,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
                fdm: this.fdm,
                throttle: this.throttle,
                toolChoice: this.toolChoice,
                codeExecution: this.codeExecution,
                urlContext: this.urlContext,
                googleSearch: this.googleSearch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });

            this.toolChoiceValidator = new ToolChoiceValidator({ toolChoice: this.toolChoice });
        }

        public override clone(): GoogleEngine<fdm> {
            const engine = new GoogleEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }

        protected override async infer(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.infer(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override async stateless(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateless(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateful(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override useStateless(middleware: Middleware.From<fdm>): GoogleEngine<fdm> {
            return super.useStateless(middleware) as GoogleEngine<fdm>;
        }
        public override useStateful(middleware: Middleware.From<fdm>): GoogleEngine<fdm> {
            return super.useStateful(middleware) as GoogleEngine<fdm>;
        }

        /**
         * @param session mutable
         */
        public override async *agentloop(
            wfctx: InferenceContext,
            session: Engine.Session.From<fdm>,
            fnm: Function.Map<fdm>,
            limit = Number.POSITIVE_INFINITY,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session) as RoleMessage.Ai.From<fdm>;
                if (response.allText()) return response.getText();
                const frs: Function.Response.From<fdm>[] = [];
                const images: Media.Image[] = [];
                for (const part of response.getParts()) {
                    if (part instanceof Engine.RoleMessage.Part.Text) {
                        yield part.text;
                    } else if (part instanceof Function.Call) {
                        const fc = part as Function.Call.From<fdm>;
                        const f = fnm[fc.name];
                        try {
                            const rawfr = await f.call(fnm, fc.args, fc);
                            if (typeof rawfr === 'string') {
                                const fr = Function.Response.Successful.of({
                                    id: fc.id,
                                    name: fc.name,
                                    text: rawfr,
                                } as Function.Response.Successful.Options.From<fdm>);
                                frs.push(fr);
                            } else if (rawfr instanceof Media.Image) {
                                const fr = Function.Response.Successful.of({
                                    id: fc.id,
                                    name: fc.name,
                                    text: '',
                                } as Function.Response.Successful.Options.From<fdm>);
                                frs.push(fr);
                                images.push(rawfr);
                            } else if (rawfr instanceof Media.Text) {
                                const fr = Function.Response.Successful.of({
                                    id: fc.id,
                                    name: fc.name,
                                    text: rawfr.quote(),
                                } as Function.Response.Successful.Options.From<fdm>);
                                frs.push(fr);
                            } else throw new Error('Unsupported function response type');
                        } catch (e) {
                            if (e instanceof Function.Error) {} else throw e;
                            const fr = Function.Response.Failed.of({
                                id: fc.id,
                                name: fc.name,
                                error: e.message,
                            } as Function.Response.Failed.Options.From<fdm>);
                            frs.push(fr);
                        }
                    } else if (part instanceof RoleMessage.Ai.Part.ExecutableCode) {
                        yield RoleMessage.Ai.encodeExecutableCodePart(part);
                    } else if (part instanceof RoleMessage.Ai.Part.CodeExecutionResult) {
                        yield RoleMessage.Ai.encodeCodeExecutionResultPart(part);
                    } else throw new Error();
                }
                session.chatMessages.push(new RoleMessage.User([...frs, ...images]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }

    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Options<fdm> {
        codeExecution?: boolean;
        urlContext?: boolean;
        googleSearch?: boolean;
    }

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import RoleMessage = MessageModule.RoleMessage;
    export import Transport = TransportModule.Transport;
}
