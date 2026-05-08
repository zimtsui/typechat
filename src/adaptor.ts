import { Config } from './config.ts';
import { Function } from './function.ts';
import { Throttle } from './throttle.ts';
import { GoogleEngine } from './engines/google.ts';
import { OpenAIResponsesEngine } from './engines/openai-responses.ts';
import { OpenAIChatCompletionsEngine } from './engines/openai-chatcompletions.ts';
import { AnthropicEngine } from './engines/anthropic.ts';
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
    >(adaptorOptions: Adaptor.Params<fdm>): Engine<fdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec) {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: Engine.Options<fdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        if (endpointSpec.apiType === 'openai-responses')
            return OpenAIResponsesEngine.create<fdm>(options);
        else if (endpointSpec.apiType === 'google')
            return GoogleEngine.create<fdm>(options);
        else if (endpointSpec.apiType === 'anthropic')
            return AnthropicEngine.create<fdm>(options);
        else if (endpointSpec.apiType === 'openai-chatcompletions')
            return OpenAIChatCompletionsEngine.create<fdm>(options);
        else throw new Error();
    }

    public makeGoogleEngine<
        fdm extends Function.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.GoogleParams<fdm>): GoogleEngine<fdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec?.apiType === 'google') {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: GoogleEngine.Options<fdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        return new GoogleEngine.Instance(options);
    }

    public makeOpenAIResponsesEngine<
        fdm extends Function.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.OpenAIResponsesParams<fdm>): OpenAIResponsesEngine<fdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec?.apiType === 'openai-responses') {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: OpenAIResponsesEngine.Options<fdm> = {
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
    > extends Omit<Engine.Options<fdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface GoogleParams<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Omit<GoogleEngine.Options<fdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface OpenAIResponsesParams<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Omit<OpenAIResponsesEngine.Options<fdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }
}
