import test from 'ava';
import { MIMEType } from 'node:util';
import { Media } from '../build/media.js';

const binary = text => new TextEncoder().encode(text).buffer;

test('Media image rejects non-image MIME type', t => {
    const error = t.throws(() => new Media.Image(binary('hello'), new MIMEType('text/plain')));

    t.is(error?.message, 'Major MIME type of image must be `image`.');
});

test('Media text rejects non-text MIME type', t => {
    const error = t.throws(() => new Media.Text('{}', new MIMEType('application/json')));

    t.is(error?.message, 'Major MIME type of text must be `text`.');
});

test('Media text quotes as verbatim quotation', t => {
    const media = new Media.Text('hello', new MIMEType('text/plain'));

    t.is(media.quote().trim(), '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>');
});

test('Media binary payloads stringify as base64', t => {
    t.is(String(new Media.Image(binary('hello'), new MIMEType('image/png'))), 'aGVsbG8=');
    t.is(String(new Media.Pdf(binary('pdf'))), 'cGRm');
});
