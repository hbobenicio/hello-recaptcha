export class HttpUpstreamError extends Error {
    constructor(message, response, ...args) {
        super(message, ...args);
        this.name = this.constructor.name;
        this.response = response;
    }
}

export class HttpUpstreamStatusError extends HttpUpstreamError {
    constructor(message, response, ...args) {
        super(message, response, ...args);
        this.name = this.constructor.name;
    }
}

export class HttpUpstreamParsingError extends Error {
    constructor(message, response, ...args) {
        super(message, response, ...args);
        this.name = this.constructor.name;
    }
}
