import { Function } from '../function.ts';
import { Engine } from '../engine.ts';
import { MessageCodec } from './openai-chatcompletions/message-codec.ts';
import { Transport } from './openai-chatcompletions/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import { ToolCodec } from './openai-chatcompletions/tool-codec.ts';
import { Billing } from './openai-chatcompletions/billing.ts';


export type OpenAIChatCompletionsEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = OpenAIChatCompletionsEngine.Instance<fdm, vdm>;
export namespace OpenAIChatCompletionsEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm, vdm>;

        public constructor(protected options: OpenAIChatCompletionsEngine.Options<fdm, vdm>) {
            super(options);
            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
                fdm: this.fdm,
                throttle: this.throttle,
                structuringChoice: this.structuringChoice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
            if (Object.keys(this.fdm).length && Object.keys(this.vdm).length)
                throw new Error('Functions cannot be declared together with Verbatim Channels in OpenAI ChatCompletions Engine.');
        }

        public override clone(): Engine<fdm, vdm> {
            const engine = new OpenAIChatCompletionsEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {}

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(options: Engine.Options<fdm, vdm>): Engine<fdm, vdm> {
        return new Instance(options);
    }
}
