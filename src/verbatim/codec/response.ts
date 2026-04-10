import Handlebars from 'handlebars';
import Assets from '../../assets.ts';
import { loggers } from '../../telemetry.ts';
import { MIMEType } from 'whatwg-mimetype';
import './escape.ts';


const template = Handlebars.compile<template.Input>(Assets.verbatim.response);
namespace template {
    export interface Input {
        name: string;
        mimeType: string;
        text: string;
    }
}

export function encode(name: string, mimeType: MIMEType, text: string): string {
    if (text.includes(']]>'))
        loggers.message.warn('The text contains "]]>", which is not allowed in XML CDATA sections. ');
    return template({ name, mimeType: `${mimeType}`, text });
}
