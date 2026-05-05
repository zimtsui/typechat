import { Type } from 'typebox';
import { MIMEType } from 'whatwg-mimetype';


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

export const verbatimDeclarationMap = {
    note: {
        description: 'A note.',
        parameters: {
            body: {
                description: 'Body text.',
                mimeType: new MIMEType('text/plain'),
                required: false,
            },
        },
    },
};

export const articleVerbatimDeclarationMap = {
    submit: {
        description: 'Submit an article.',
        parameters: {
            title: {
                description: 'Article title.',
                mimeType: new MIMEType('text/plain'),
                required: false,
            },
            body: {
                description: 'Article body.',
                mimeType: new MIMEType('text/markdown'),
                required: false,
            },
        },
    },
    attachment: {
        description: 'Attach a file.',
        parameters: {
            file: {
                description: 'File content.',
                mimeType: new MIMEType('application/octet-stream'),
                required: false,
            },
        },
    },
};

export const requiredArticleVerbatimDeclarationMap = {
    submit: {
        description: 'Submit an article.',
        parameters: {
            title: {
                description: 'Article title.',
                mimeType: new MIMEType('text/plain'),
                required: true,
            },
            body: {
                description: 'Article body.',
                mimeType: new MIMEType('text/markdown'),
                required: true,
            },
        },
    },
};

export function getOnlyText(message) {
    const parts = message.getParts();
    return parts[0].text;
}
