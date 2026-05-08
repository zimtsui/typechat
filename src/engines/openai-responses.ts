import { Engine, Middleware } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './openai-responses/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import { ToolChoiceValidator } from './openai-responses/tool-choice-validator.ts';
import { Transport } from './openai-responses/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import { Session } from '../engine/session.ts';
import * as MessageModule from './openai-responses/message.ts';
import * as ToolModule from './openai-responses/tool.ts';
import OpenAI from 'openai';


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

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link Recoverable} 模型抽风但可恢复
        * @throws {@link TypeError} 网络故障
        */
        protected override async infer(
            wfctx: InferenceContext,
            session: Session.From<fdm>,
        ): Promise<RoleMessage.Ai.From<fdm>> {
            try {
                return await super.infer(wfctx, session) as RoleMessage.Ai.From<fdm>;
            } catch (e) {
                if (e instanceof OpenAI.APIConnectionError)
                    throw new TypeError(undefined, { cause: e });
                else throw e;
            }
        }

        public override async stateless(wfctx: InferenceContext, session: Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateless(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateful(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override useStateless(middleware: Middleware.From<fdm>): OpenAIResponsesEngine<fdm> {
            return super.useStateless(middleware) as OpenAIResponsesEngine<fdm>;
        }
        public override useStateful(middleware: Middleware.From<fdm>): OpenAIResponsesEngine<fdm> {
            return super.useStateful(middleware) as OpenAIResponsesEngine<fdm>;
        }

        /**
         * @param session mutable
         */
        public override async *agentloop(
            wfctx: InferenceContext,
            session: Session.From<fdm>,
            fnm: Function.Map<fdm>,
            limit = Number.POSITIVE_INFINITY,
            applyPatch?: Tool.ApplyPatch,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session);
                if (response.allText()) return response.getText();
                const pfress: Promise<Function.Response.From<fdm>>[] = [];
                const papress: Promise<Tool.ApplyPatch.Response>[] = [];
                for (const part of response.getParts()) {
                    if (part instanceof Engine.RoleMessage.Ai.Part.Text) {
                        yield part.text;
                    } else if (part instanceof Function.Call) {
                        const fcall = part as Function.Call.From<fdm>;
                        const f = fnm[fcall.name];
                        pfress.push((async () => {
                            try {
                                return Function.Response.Successful.of({
                                    id: fcall.id,
                                    name: fcall.name,
                                    text: await f.call(fnm, fcall.args, fcall),
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
                    } else if (part instanceof Tool.ApplyPatch.Call) {
                        if (applyPatch) {} else throw new Error('Apply patch handler missing.');
                        papress.push((async () => new Tool.ApplyPatch.Response({
                            id: part.raw.call_id,
                            failure: await applyPatch(part.raw.operation),
                        }))());
                    } else throw new Error();
                }
                const fress = await Promise.all(pfress);
                const aprs = await Promise.all(papress);
                session.chatMessages.push(new RoleMessage.User([...fress, ...aprs]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Options<fdm> {
        applyPatch?: boolean;
    }

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import Tool = ToolModule.Tool;
    export import RoleMessage = MessageModule.RoleMessage;
}
