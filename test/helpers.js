import { Type } from 'typebox';


export const functionDeclarationMap = {
    noop: {
        description: 'No-op tool.',
        parameters: Type.Object({}),
    },
};

export const functionDeclarationMapWithArgs = {
    echo: {
        description: 'Echo text.',
        parameters: Type.Object({
            text: Type.String(),
        }),
    },
    noop: {
        description: 'No-op tool.',
        parameters: Type.Object({}),
    },
};

export function getOnlyText(message) {
    return message.getTextParts()[0].raw;
}
