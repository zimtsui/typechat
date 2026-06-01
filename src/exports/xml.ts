import { Engine } from '../engine.ts';
import Assets from '../assets.ts';
export * from '../xml.ts';

export const instruction = Engine.Message.Part.Text.paragraph(Assets.Xml.instruction);
