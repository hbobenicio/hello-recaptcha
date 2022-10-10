const config = {
    server: {
        host: 'localhost',
        port: 8081,
    },
    recaptcha: {
        //TODO this is a secret. Should not be defined in code like this... it's here just for demo purposes.
        secret: 'YOUR_SECRET_HERE',

        // This is the domain hostname that you've registered in recaptcha.
        // It'll be used to validate the response from recaptcha
        hostname: 'localhost',
    },
};

export default config;
