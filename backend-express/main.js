import express from 'express';
import bodyParser from 'body-parser';
import Ajv from 'ajv';

import config from './config.js';
import { HttpUpstreamStatusError, HttpUpstreamParsingError } from './error.js';
import {
    default as recaptchaService,
    RecaptchaServiceSiteVerifyNoSuccessError,
    RecaptchaServiceSiteVerifyHostnameMismatchError
} from './recaptcha/recaptcha.service.js';

const app = express();

const api = express.Router();
app.use('/api', api);

const ajv = new Ajv();

const demoRecaptchaV2EndpointPayloadSchema = {
    type: 'object',
    properties: {
        username: {
            type: 'string',
        },
        password: {
            type: 'string',
        },
        recaptchaResponseToken: {
            type: 'string',
        },
    },
    required: ['username', 'password', 'recaptchaResponseToken']
};
const demoRecaptchaV2EndpointPayloadValidate = ajv.compile(demoRecaptchaV2EndpointPayloadSchema);
api.post('/demo-recaptcha-v2-endpoint', [ bodyParser.json() ], async (req, res) => {
    const payload = req.body;
    if (!demoRecaptchaV2EndpointPayloadValidate(payload)) {
        console.warn('/demo-recaptcha-v2-endpoint :: invalid payload: ',  demoRecaptchaV2EndpointPayloadValidate.errors);
        res.status(400).json({
            message: 'Bad Request',
            errors: [],
        });
        return;
    }

    // const remoteIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const remoteIp = req.socket.remoteAddress;

    try {
        await recaptchaService.siteVerify(payload.recaptchaResponseToken, remoteIp);
    } catch (e) {
        if (e instanceof HttpUpstreamStatusError || e instanceof HttpUpstreamParsingError) {
            res.status(502).send('Bad Gateway');
            return;
        }

        if (e instanceof RecaptchaServiceSiteVerifyNoSuccessError) {
            console.warn(e);
            res.status(400).json({
                message: e.message,
                errors: e.errors,
            });
            return;
        }

        if (e instanceof RecaptchaServiceSiteVerifyHostnameMismatchError) {
            console.warn(e.message);
            res.status(400).json({
                message: e.message,
                errors: [],
            });
            return;
        }

        throw e;
    }

    // do something with business data (username and password), maybe...
    console.log('request succeded');

    res.status(200).end();
});

app.all('/', async (req, res) => {
    console.log('Received a request to an unknown route');
    res.status(404).send('Not Found');
});

app.listen(config.server.port, config.server.host, function(){
    console.log(`Server is running on ${config.server.host}:${config.server.port}`);
});
