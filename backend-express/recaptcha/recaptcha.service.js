import fetch from "node-fetch";

import config from "../config.js";
import { HttpUpstreamStatusError, HttpUpstreamParsingError } from '../error.js';

/**
 * Represents a recaptcha siteverify validation error triggered when the response payload contains `success: false`.
 */
export class RecaptchaServiceSiteVerifyNoSuccessError extends Error {

    /**
     * https://developers.google.com/recaptcha/docs/verify#error_code_reference
     */
    static errorCodeReference = {
        'missing-input-secret': 	'The secret parameter is missing',
        'invalid-input-secret': 	'The secret parameter is invalid or malformed',
        'missing-input-response': 	'The response parameter is missing',
        'invalid-input-response': 	'The response parameter is invalid or malformed',
        'bad-request': 	            'The request is invalid or malformed',
        'timeout-or-duplicate': 	'The response is no longer valid: either is too old or has been used previously',
    };

    /**
     * @param {string} message The error message
     * @param {object} responseBody The response's body object
     */
    constructor(message, responseBody) {
        this.errors = responseBody['error-codes'].map(errorCode => ({
            code: errorCode,
            reason: RecaptchaServiceSiteVerifyNoSuccessError.errorCodeReference[errorCode],
        }));
        super(message);
        this.name = this.constructor.name;
    }
}

export class RecaptchaServiceSiteVerifyHostnameMismatchError extends Error {
    constructor(hostname, ...args) {
        super(`hostname mismatch. hostname=${hostname}`, ...args);
        this.name = this.constructor.name;
        this.hostname = hostname;
    }
}

class RecaptchaService {
    static baseUrl = 'https://www.google.com/recaptcha/api';

    constructor() {}

    /**
     * Posts a v2 siteverify recaptcha's API request.
     *
     * @param {string} recaptchaResponseToken Token de resposta do challenge do recaptcha, feito pelo usuário no frontend
     * @param {string} remoteIp The users remote IP used in the recaptcha challenge
     *
     * @see https://developers.google.com/recaptcha/docs/verify
     */
    async siteVerify(recaptchaResponseToken, remoteIp) {
        // the endpoint url
        const url = `${RecaptchaService.baseUrl}/siteverify`;

        // The siteverify API don't receive it's parameters as a JSON from the body of our request.
        // Instead, it expects its params as a form submission encoding (aka 'application/x-www-form-urlencoded')
        const params = new URLSearchParams();
        params.append('secret', config.recaptcha.secret);
        params.append('response', recaptchaResponseToken);
        params.append('remoteip', remoteIp);

        // Possible errors that could happen with this:
        // 1. I/O exception -> Internal Server Error | Bad Gateway
        // 2. non 200 response code (unlikely) -> Internal Server Error | Bad Gateway
        // 3. parsing error (unlikely) -> Internal Server Error | Bad Gateway
        // 4. non successful response body (expected to happen) -> Bad Request
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded; charset=utf-8',
                'Accept': 'application/json'
            },
            body: params,
        });

        //NOTE(neo-fetch): 3xx-5xx responses are NOT exceptions, and should be handled
        if (!response.ok) {
            throw new HttpUpstreamStatusError('recaptcha siteverify failed with a non 2xx status', response);
        }

        // The response body is a json object
        let responseBody;
        try {
            responseBody = await response.json();
        } catch(e) {
            throw new HttpUpstreamParsingError('recaptcha siteverify response parsing failed', response);
        }

        // Payload examples
        //
        // success example:
        // {
        //      success: true,
        //      challenge_ts: '2022-07-16T11:10:30Z',
        //      hostname: 'localhost'
        // }
        //
        // error example:
        // {
        //      success: false,
        //      'error-codes': [ 'missing-input-secret' ]
        // }

        if (!responseBody.success) {
            throw new RecaptchaServiceSiteVerifyNoSuccessError('no success', responseBody);
        }

        // https://developers.google.com/recaptcha/docs/domain_validation
        // https://developers.google.com/recaptcha/docs/domain_validation#security_warning
        if (responseBody.hostname !== config.recaptcha.hostname) {
            throw new RecaptchaServiceSiteVerifyHostnameMismatchError(config.recaptcha.hostname);
        }
    }
};

export default new RecaptchaService();
