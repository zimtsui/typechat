import { Engine, Middleware } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './dashscope/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import * as TransportModule from './dashscope/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import * as MessageModule from './dashscope/message.ts';
import OpenAI from 'openai';


export type DashScopeEngine<
    fdm extends Function.Decl.Map.Proto,
> = DashScopeEngine.Instance<fdm>;
export namespace DashScopeEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;

        public constructor(protected options: DashScopeEngine.Options<fdm>) {
            super(options);

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
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override clone(): DashScopeEngine<fdm> {
            const engine = new DashScopeEngine.Instance(this.options);
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
            session: Engine.Session.From<fdm>,
        ): Promise<RoleMessage.Ai.From<fdm>> {
            try {
                return await super.infer(wfctx, session) as RoleMessage.Ai.From<fdm>;
            } catch (e) {
                if (e instanceof OpenAI.APIConnectionError)
                    throw new TypeError(undefined, { cause: e });
                else throw e;
            }
        }

        public override async stateless(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateless(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<RoleMessage.Ai.From<fdm>> {
            return await super.stateful(wfctx, session) as RoleMessage.Ai.From<fdm>;
        }

        public override useStateless(middleware: Middleware.From<fdm>): DashScopeEngine<fdm> {
            return super.useStateless(middleware) as DashScopeEngine<fdm>;
        }
        public override useStateful(middleware: Middleware.From<fdm>): DashScopeEngine<fdm> {
            return super.useStateful(middleware) as DashScopeEngine<fdm>;
        }

    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Options<fdm> {}

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import RoleMessage = MessageModule.RoleMessage;
    export import Transport = TransportModule.Transport;
}
