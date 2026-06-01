import { Config } from './config.ts';
import { Function } from './function.ts';
import { Throttle } from './throttle.ts';
import { GoogleEngine } from './engines/google.ts';
import { OpenAIResponsesEngine } from './engines/openai-responses.ts';
import { OpenAIChatCompletionsEngine } from './engines/openai-chatcompletions.ts';
import { AnthropicEngine } from './engines/anthropic.ts';
import { OpenAICompatibleEngine } from './engines/openai-compatible.ts';
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
            return OpenAIResponsesEngine.createEngine<fdm>(options);
        else if (endpointSpec.apiType === 'google')
            return GoogleEngine.createEngine<fdm>(options);
        else if (endpointSpec.apiType === 'anthropic')
            return AnthropicEngine.createEngine<fdm>(options);
        else if (endpointSpec.apiType === 'openai-chatcompletions')
            return OpenAIChatCompletionsEngine.createEngine<fdm>(options);
        else if (endpointSpec.apiType === 'openai-compatible')
            return OpenAICompatibleEngine.createEngine<fdm>(options);
        else throw new Error();
    }
}

export namespace Adaptor {
    export interface Params<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Omit<Engine.Options<fdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }
}
