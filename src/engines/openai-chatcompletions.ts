import { Function } from '../function.ts';
import { Engine } from '../engine.ts';
import { MessageCodec } from './openai-chatcompletions/message-codec.ts';
import * as TransportModule from './openai-chatcompletions/transport.ts';
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

        public constructor(protected options: Engine.Options<fdm>) {
            super(options);
            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                messageValidator: this.messageValidator,
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
    }

    export import Transport = TransportModule.Transport;

    createEngine satisfies Engine.Create;
    export function createEngine<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }
}
