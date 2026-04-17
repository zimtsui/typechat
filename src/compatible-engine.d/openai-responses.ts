import { CompatibleEngine } from '../compatible-engine.ts';
import { Function } from '../function.ts';
import { ToolCodec } from '../api-types/openai-responses/tool-codec.ts';
import { Billing } from '../api-types/openai-responses/billing.ts';
import * as MessageCodecModule from './openai-responses/message-codec.ts';
import * as TransportModule from './openai-responses/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import * as ChoiceCodecModule from './openai-responses/choice-codec.ts';



export type OpenAIResponsesCompatibleEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = OpenAIResponsesCompatibleEngine.Instance<fdm, vdm>;
export namespace OpenAIResponsesCompatibleEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: OpenAIResponsesCompatibleEngine.MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: OpenAIResponsesCompatibleEngine.Transport<fdm, vdm>;

        public constructor(options: OpenAIResponsesCompatibleEngine.Options<fdm, vdm>) {
            super(options);
            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new OpenAIResponsesCompatibleEngine.MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new OpenAIResponsesCompatibleEngine.Transport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
                fdm: this.fdm,
                throttle: this.throttle,
                choice: this.choice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Options<fdm, vdm> {}

    export import MessageCodec = MessageCodecModule.MessageCodec;
    export import Transport = TransportModule.Transport;
    export import ChoiceCodec = ChoiceCodecModule;
}
