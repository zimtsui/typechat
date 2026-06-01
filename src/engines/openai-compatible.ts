import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './openai-compatible/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import * as TransportModule from './openai-compatible/transport.ts';


export type OpenAICompatibleEngine<
    fdm extends Function.Decl.Map.Proto,
> = OpenAICompatibleEngine.Instance<fdm>;
export namespace OpenAICompatibleEngine {
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

    createEngine satisfies Engine.Create;
    export function createEngine<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import Transport = TransportModule.Transport;
}
