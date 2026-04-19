import Handlebars from 'handlebars';
import Assets from '../../assets.ts';
import './escape.ts';


const template = Handlebars.compile<template.Input>(Assets.verbatim.system);
namespace template {
    export interface Input {
        text: string;
    }
}

export function encode(text: string): string {
    return template({ text });
}
