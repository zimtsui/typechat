import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './openai-compatible/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import * as TransportModule from './openai-compatible/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import * as MessageModule from './openai-compatible/message.ts';
import OpenAI from 'openai';


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

        public override clone(): OpenAICompatibleEngine<fdm> {
            const engine = new OpenAICompatibleEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }

    }

    createEngine satisfies Engine.Create;
    export function createEngine<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import RoleMessage = MessageModule.RoleMessage;
    export import Transport = TransportModule.Transport;
}
