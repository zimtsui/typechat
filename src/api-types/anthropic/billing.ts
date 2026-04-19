import type { Pricing } from '../../engine.ts';
import Anthropic from '@anthropic-ai/sdk';


export class Billing {
    public constructor(protected options: Billing.Options) {}

    public charge(usage: Anthropic.Usage): number {
        const cacheHitTokenCount = usage.cache_read_input_tokens || 0;
        const cacheMissTokenCount = usage.input_tokens - cacheHitTokenCount;
        return (
            this.options.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.options.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.options.pricing.outputPrice * usage.output_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing;
    }
}
