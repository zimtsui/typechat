# XML Verbatim Channel

## Motivation

When a LLM outputs structured data in JSON format, if there are too many special characters in the parameters (for example, a large Markdown document containing a lot of LaTeX math formulas), the LLM is prone to make mistakes in JSON escaping.

XML Verbatim Channel is designed to avoid escaping in structured output of large text.

## Declaration

The system or the user is expected to declare all available XML Verbatim Channels in the form of

<verbatim:declaration name="NAME_OF_CHANNEL">
    <verbatim:description>DESCRIPTION_OF_CHANNEL</verbatim:description>
    <verbatim:parameter name="NAME_OF_PARAMETER_1" required="true">
        <verbatim:description>DESCRIPTION_OF_PARAMETER</verbatim:description>
        <verbatim:mime-type>MIME_TYPE_OF_PARAMETER</verbatim:mime-type>
    </verbatim:parameter>
    <verbatim:parameter name="NAME_OF_PARAMETER_2" required="false">
        <verbatim:description>DESCRIPTION_OF_PARAMETER</verbatim:description>
        <verbatim:mime-type>MIME_TYPE_OF_PARAMETER</verbatim:mime-type>
    </verbatim:parameter>
</verbatim:declaration>

## Request

You can make a request through a channel in the form of

<verbatim:request name="NAME_OF_CHANNEL">
    <verbatim:parameter name="NAME_OF_PARAMETER_1"><![CDATA[ARGUMENT_OF_PARAMETER]]></verbatim:parameter>
    <verbatim:parameter name="NAME_OF_PARAMETER_2"><![CDATA[ARGUMENT_OF_PARAMETER]]></verbatim:parameter>
</verbatim:request>

All arguments must be wrapped in CDATA.

## Response

Not all requests have a response. The optional response is expected in the form of

<verbatim:response name="NAME_OF_CHANNEL"><![CDATA[RESPONSE_CONTENT]]></verbatim:response>

## System

Verbatim content from the system is expected in the form of

<verbatim:system name="NAME_OF_CHANNEL"><![CDATA[SYSTEM_CONTENT]]></verbatim:system>
