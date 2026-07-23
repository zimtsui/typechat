import type * as TypeChat from '@zimtsui/typechat';

// 配置推理服务商 API 接入点
export const config: TypeChat.Config = {
    endpoints: {
        'gpt-5.6-luna': {
            baseUrl: 'https://api.openai.com/v1',
            model: 'gpt-5.6-luna',
            name: 'GPT-5.6 Luna',
            apiType: 'openai-responses',
        },
        'gemini-3.5-flash': {
            baseUrl: 'https://generativelanguage.googleapis.com',
            model: 'gemini-3.5-flash',
            name: 'Gemini 3.5 Flash',
            apiType: 'google',
        },
    },
};
export const secret: TypeChat.Secret = {
    endpoints: {
        'gpt-5.6-luna': {
            apiKey: process.env.OPENAI_API_KEY!,
        },
        'gemini-3.5-flash': {
            apiKey: process.env.GOOGLE_API_KEY!,
        },
    },
};
