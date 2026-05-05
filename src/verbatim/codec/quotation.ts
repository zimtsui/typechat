import Assets from '../../assets.ts';
import Handlebars from './helpers.ts';
import { MIMEType } from 'whatwg-mimetype';


const template = Handlebars.compile<template.Input>(Assets.verbatim.quotation);
namespace template {
    export interface Input {
        mimeType: string;
        text: string;
        author?: string;
    }
}

export function encode(mimeType: MIMEType, text: string, author?: string): string {
    return template({ mimeType: `${mimeType}`, text, author });
}
