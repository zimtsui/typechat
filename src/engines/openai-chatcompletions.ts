import { Function } from '../function.ts';
import { Engine } from '../engine.ts';
import { MessageCodec } from './openai-chatcompletions/message-codec.ts';
import { Transport } from './openai-chatcompletions/transport.ts';
import { ToolCodec } from './openai-chatcompletions/tool-codec.ts';
import { Billing } from './openai-chatcompletions/billing.ts';


export type OpenAIChatCompletionsEngine<
    fdm extends Function.Decl.Map.Proto,
> = OpenAIChatCompletionsEngine.Instance<fdm>;
export namespace OpenAIChatCompletionsEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;

        public constructor(protected options: OpenAIChatCompletionsEngine.Options<fdm>) {
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

        public override clone(): Engine<fdm> {
            const engine = new OpenAIChatCompletionsEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
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
}
