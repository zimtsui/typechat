import Assets from '../../assets.ts';
import Handlebars from './helpers.ts';
import { MIMEType } from 'whatwg-mimetype';


const template = Handlebars.compile<template.Input>(Assets.verbatim.response);
namespace template {
    export interface Input {
        name: string;
        mimeType: string;
        text: string;
    }
}

export function encode(name: string, mimeType: MIMEType, text: string): string {
    return template({ name, mimeType: `${mimeType}`, text });
}
