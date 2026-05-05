import { Config } from './config.ts';
import { Function } from './function.ts';
import { Throttle } from './throttle.ts';
import { GoogleEngine } from './engines/google.ts';
import { OpenAIResponsesEngine } from './engines/openai-responses.ts';
import { OpenAIChatCompletionsEngine } from './engines/openai-chatcompletions.ts';
import { AnthropicEngine } from './engines/anthropic.ts';
import type { Verbatim } from './verbatim.ts';
import { Engine } from './engine.ts';


export class Adaptor {
    public static create(config: Config): Adaptor {
        return new Adaptor(config);
    }

    protected throttles = new Map<string, Throttle>();
    protected constructor(public config: Config) {
        for (const endpointId in this.config.endpoints) {
            const rpm = this.config.endpoints[endpointId]!.rpm ?? Number.POSITIVE_INFINITY;
            this.throttles.set(endpointId, new Throttle(rpm));
        }
    }

    public makeEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.Params<fdm, vdm>): Engine<fdm, vdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec) {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: Engine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        if (endpointSpec.apiType === 'openai-responses')
            return OpenAIResponsesEngine.create<fdm, vdm>(options);
        else if (endpointSpec.apiType === 'google')
            return GoogleEngine.create<fdm, vdm>(options);
        else if (endpointSpec.apiType === 'anthropic')
            return AnthropicEngine.create<fdm, vdm>(options);
        else if (endpointSpec.apiType === 'openai-chatcompletions')
            return OpenAIChatCompletionsEngine.create<fdm, vdm>(options);
        else throw new Error();
    }

    public makeGoogleEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.GoogleParams<fdm, vdm>): GoogleEngine<fdm, vdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec?.apiType === 'google') {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: GoogleEngine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        return new GoogleEngine.Instance(options);
    }

    public makeOpenAIResponsesEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.OpenAIResponsesParams<fdm, vdm>): OpenAIResponsesEngine<fdm, vdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec?.apiType === 'openai-responses') {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: OpenAIResponsesEngine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        return new OpenAIResponsesEngine.Instance(options);
    }
}

export namespace Adaptor {
    export interface Params<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<Engine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface GoogleParams<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<GoogleEngine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface OpenAIResponsesParams<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<OpenAIResponsesEngine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }
}
