import * as TypeChat from '@zimtsui/typechat';
import { config } from './config.ts';

// 创建会话
const session: TypeChat.Engine.Session<never> = {
    developerMessage: new TypeChat.Engine.Message.Developer([
        TypeChat.Text.paragraph('You are a helpful assistant.'),
    ]),
    chatMessages: [
        new TypeChat.Engine.Message.Input([ TypeChat.Text.paragraph('Hello!') ]),
    ],
};

// 选择推理引擎
const adaptor = TypeChat.Adaptor.create(config);
const engine = adaptor.makeEngine<{}>({
    endpoint: 'gpt-5.4-mini',
    functionDeclarationMap: {},
});

const response = await engine.stateless({}, session);
console.log(response.joinText());
