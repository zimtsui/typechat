import type { Pricing } from '../../engine.ts';
import Anthropic from '@anthropic-ai/sdk';


export class Billing {
    public constructor(protected comps: Billing.Components) {}

    public charge(usage: Anthropic.Usage): number {
        const cacheHitTokenCount = usage.cache_read_input_tokens || 0;
        const cacheMissTokenCount = usage.input_tokens - cacheHitTokenCount;
        return (
            this.comps.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.comps.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.comps.pricing.outputPrice * usage.output_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Components {
        pricing: Pricing;
    }
}
