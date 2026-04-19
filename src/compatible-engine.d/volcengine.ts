import { Function } from '../function.ts';
import { CompatibleEngine } from '../compatible-engine.ts';
import * as TransportModule from './volcengine/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import { OpenAIResponsesCompatibleEngine } from './openai-responses.ts';



export type VolcengineCompatibleEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = VolcengineCompatibleEngine.Instance<fdm, vdm>;
export namespace VolcengineCompatibleEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends OpenAIResponsesCompatibleEngine.Instance<fdm, vdm> {
        protected override transport: TransportModule.Transport<fdm, vdm>;

        public constructor(protected override options: VolcengineCompatibleEngine.Options<fdm, vdm>) {
            super(options);
            this.transport = new TransportModule.Transport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
                fdm: this.fdm,
                throttle: this.throttle,
                choice: this.structuringChoice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override clone(): VolcengineCompatibleEngine<fdm, vdm> {
            const engine = new VolcengineCompatibleEngine.Instance(this.options);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Options<fdm, vdm> {}

    export import Transport = TransportModule.Transport;
}
