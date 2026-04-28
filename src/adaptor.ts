import { Config } from './config.ts';
import { Function } from './function.ts';
import { Throttle } from './throttle.ts';
import { GoogleEngine } from './engines/google.ts';
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
    >(adaptorOptions: Adaptor.EngineOptions<fdm, vdm>): Engine<fdm, vdm> {
        const endpointSpec = this.config.endpoints[adaptorOptions.endpoint];
        if (endpointSpec) {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: Engine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        if (endpointSpec.apiType === 'google')
            return new GoogleEngine.Instance<fdm, vdm>(options);
        else throw new Error();
    }

    public makeGoogleEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.GoogleEngineOptions<fdm, vdm>): GoogleEngine<fdm, vdm> {
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
}

export namespace Adaptor {
    export interface EngineOptions<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<Engine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface GoogleEngineOptions<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<GoogleEngine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }
}
