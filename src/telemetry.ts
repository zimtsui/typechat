import * as Presets from '@zimtsui/typelemetry/logs/presets';

export const loggers = {
    inference: Presets.loggerProvider.getLogger<string>('@zimtsui/typechat', 'Inference') as Presets.Logger<string>,
    stream: Presets.loggerProvider.getLogger<unknown>('@zimtsui/typechat', 'Chunk') as Presets.Logger<unknown>,
    message: Presets.loggerProvider.getLogger<unknown>('@zimtsui/typechat', 'Message') as Presets.Logger<unknown>,
};
