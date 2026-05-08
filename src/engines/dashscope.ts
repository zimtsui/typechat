import { Engine, Middleware } from '../engine.ts';
import { Function } from '../function.ts';
import { Transport } from './dashscope/transport.ts';
import { OpenAIResponsesEngine } from './openai-responses.ts';


export type DashScopeEngine<
    fdm extends Function.Decl.Map.Proto,
> = DashScopeEngine.Instance<fdm>;
export namespace DashScopeEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends OpenAIResponsesEngine.Instance<fdm> {
        public constructor(options: OpenAIResponsesEngine.Options<fdm>) {
            super(options);

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
        }

        public override clone(): DashScopeEngine<fdm> {
            const engine = new DashScopeEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
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
    > extends OpenAIResponsesEngine.Options<fdm> {
        applyPatch?: false;
    }

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
    >(options: OpenAIResponsesEngine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import Tool = OpenAIResponsesEngine.Tool;
    export import RoleMessage = OpenAIResponsesEngine.RoleMessage;
}
