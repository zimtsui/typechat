import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './openai-responses/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import { ToolChoiceValidator } from './openai-responses/tool-choice-validator.ts';
import * as TransportModule from './openai-responses/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import * as MessageModule from './openai-responses/message.ts';
import * as ToolModule from './openai-responses/tool.ts';
import OpenAI from 'openai';
import { Media } from '../media.ts';
import * as XmlCodec from '../xml.ts';


export type OpenAIResponsesEngine<
    fdm extends Function.Decl.Map.Proto,
> = OpenAIResponsesEngine.Instance<fdm>;
export namespace OpenAIResponsesEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;
        protected override toolChoiceValidator: ToolChoiceValidator.From<fdm>;
        protected applyPatch: boolean;

        public constructor(protected options: OpenAIResponsesEngine.Options<fdm>) {
            super(options);
            this.applyPatch = options.applyPatch ?? false;

            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
                fdm: this.fdm,
                throttle: this.throttle,
                toolChoice: this.toolChoice,
                applyPatch: this.applyPatch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
            this.toolChoiceValidator = new ToolChoiceValidator({ toolChoice: this.toolChoice });
        }

        public override clone(): OpenAIResponsesEngine<fdm> {
            const engine = new OpenAIResponsesEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }

        protected override async infer(
            wfctx: InferenceContext,
            session: Engine.Session.From<fdm>,
        ): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.infer(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override async stateless(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateless(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateful(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override useStateless(middleware: Engine.Middleware.From<fdm>): OpenAIResponsesEngine<fdm> {
            return super.useStateless(middleware) as OpenAIResponsesEngine<fdm>;
        }
        public override useStateful(middleware: Engine.Middleware.From<fdm>): OpenAIResponsesEngine<fdm> {
            return super.useStateful(middleware) as OpenAIResponsesEngine<fdm>;
        }

        /**
         * @param session mutable
         */
        public override async *agentloop(
            wfctx: InferenceContext,
            session: Engine.Session.From<fdm>,
            fnm: Function.Map<fdm>,
            limit = Number.POSITIVE_INFINITY,
            applyPatch?: Tool.ApplyPatch,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session);
                if (response.allText()) return response.getText();
                const frs: Function.Response.From<fdm>[] = [];
                const images: Media.Image[] = [];
                const aprs: Tool.ApplyPatch.Response[] = [];
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
                                    text: XmlCodec.System.encode('The image will be loaded in next LLM user-role message.'),
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
                    } else if (part instanceof Tool.ApplyPatch.Call) {
                        if (applyPatch) {} else throw new Error('Apply patch handler missing.');
                        const apr = new Tool.ApplyPatch.Response({
                            id: part.raw.call_id,
                            failure: await applyPatch(part.raw.operation),
                        });
                        aprs.push(apr);
                    } else throw new Error();
                }
                session.chatMessages.push(new RoleMessage.User([...frs, ...aprs, ...images]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Options<fdm> {
        applyPatch?: boolean;
    }

    export function create<
        fdm extends Function.Decl.Map.Proto,
    >(options: OpenAIResponsesEngine.Options<fdm>): OpenAIResponsesEngine<fdm> {
        return new Instance(options);
    }

    createEngine satisfies Engine.Create;
    export function createEngine<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance({
            endpointSpec: options.endpointSpec,
            functionDeclarationMap: options.functionDeclarationMap,
            throttle: options.throttle,
            toolChoice: options.toolChoice,
            providerRetry: options.providerRetry,
            inferenceRetry: options.inferenceRetry,
        });
    }

    export import Tool = ToolModule.Tool;
    export import RoleMessage = MessageModule.RoleMessage;
    export import Transport = TransportModule.Transport;
}
