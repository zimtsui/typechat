import { Channel } from '@zimtsui/typelemetry/log';
import * as Presets from '@zimtsui/typelemetry/log/presets';
import { formatWithOptions } from 'node:util';
import { stderr } from 'node:process';


export const logger = {
    inference: Channel.create<typeof Presets.Level, string>(
        Presets.Level,
        (chunk: string, level) => Presets.Exporter.getGlobalExporter().stream({
            scope: '@zimtsui/typechat',
            channel: 'Inference',
            level,
            payload: chunk,
        }),
    ),
    message: Channel.create<typeof Presets.Level, unknown>(
        Presets.Level,
        (payload: unknown, level) => Presets.Exporter.getGlobalExporter().monolith({
            scope: '@zimtsui/typechat',
            channel: 'Message',
            level,
            payload: formatWithOptions({ depth: null, colors: !!stderr.isTTY }, payload)
        }),
    ),
};
