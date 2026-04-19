import * as Google from '@google/genai';
import type { Pricing } from '../../engine.ts';
import { loggers } from '../../telemetry.ts';


export class Billing {
    public constructor(protected options: Billing.Options) {}

    public charge(usageMetadata: Google.GenerateContentResponseUsageMetadata): number {
        loggers.message.info(usageMetadata);

        if (usageMetadata.promptTokenCount) {} else throw new Error('Prompt token count missing.', { cause: usageMetadata });
        const candidatesTokenCount = usageMetadata.candidatesTokenCount ?? 0;
        const cacheHitTokenCount = usageMetadata.cachedContentTokenCount ?? 0;
        const cacheMissTokenCount = usageMetadata.promptTokenCount - cacheHitTokenCount;
        const thinkingTokenCount = usageMetadata.thoughtsTokenCount ?? 0;
        const cost =
            this.options.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.options.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.options.pricing.outputPrice * candidatesTokenCount / 1e6 +
            this.options.pricing.outputPrice * thinkingTokenCount / 1e6;
        return cost;
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing
    }
}
