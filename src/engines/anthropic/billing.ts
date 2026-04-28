import type { Pricing } from '../../engine.ts';
import Anthropic from '@anthropic-ai/sdk';


export class Billing {
    protected pricing: Pricing;
    public constructor(options: Billing.Options) {
        this.pricing = options.pricing;
    }

    public charge(usage: Anthropic.Usage): number {
        const cacheHitTokenCount = usage.cache_read_input_tokens || 0;
        const cacheMissTokenCount = usage.input_tokens - cacheHitTokenCount;
        return (
            this.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.pricing.outputPrice * usage.output_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing;
    }
}

