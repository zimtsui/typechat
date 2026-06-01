import { Adaptor, Engine, Text } from '@zimtsui/typechat';
import { config } from './config.ts';

// 创建会话
const session: Engine.Session<never> = {
    developerMessage: new Engine.Message.Developer([
        Text.paragraph('You are a helpful assistant.'),
    ]),
    chatMessages: [
        new Engine.Message.Input([ Text.paragraph('Hello!') ]),
    ],
};

// 选择推理引擎
const adaptor = Adaptor.create(config);
const engine = adaptor.makeEngine<{}>({
    endpoint: 'gpt-5.4-mini',
    functionDeclarationMap: {},
});

const response = await engine.stateless({}, session);
console.log(response.joinText());
