import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import { Media } from '../build/media.js';

const binary = text => new TextEncoder().encode(text).buffer;

test('Media image rejects non-image MIME type', () => {
    assert.throws(() => new Media.Image(binary('hello'), new MIMEType('text/plain')), {
        message: 'Major MIME type of image must be `image`.',
    });
});

test('Media text rejects non-text MIME type', () => {
    assert.throws(() => new Media.Text('{}', new MIMEType('application/json')), {
        message: 'Major MIME type of text must be `text`.',
    });
});

test('Media text quotes as verbatim quotation', () => {
    const media = new Media.Text('hello', new MIMEType('text/plain'));

    assert.strictEqual(media.quote().trim(), '<typechat:quotation mime-type="text/plain"><![CDATA[hello]]></typechat:quotation>');
});

test('Media binary payloads stringify as base64', () => {
    assert.strictEqual(String(new Media.Image(binary('hello'), new MIMEType('image/png'))), 'aGVsbG8=');
    assert.strictEqual(String(new Media.Pdf(binary('pdf'))), 'cGRm');
});
