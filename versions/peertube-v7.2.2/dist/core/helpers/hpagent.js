import { __rest } from "tslib";
import http from 'http';
import https from 'https';
import { URL } from 'url';
export class HttpProxyAgent extends http.Agent {
    constructor(options) {
        const { proxy } = options, opts = __rest(options, ["proxy"]);
        super(opts);
        this.keepAlive = options.keepAlive;
        this.proxy = typeof proxy === 'string'
            ? new URL(proxy)
            : proxy;
    }
    createConnection(options, callback) {
        const requestOptions = {
            method: 'CONNECT',
            host: this.proxy.hostname,
            port: this.proxy.port,
            path: `${options.host}:${options.port}`,
            setHost: false,
            headers: { connection: this.keepAlive ? 'keep-alive' : 'close', host: `${options.host}:${options.port}` },
            agent: false,
            timeout: options.timeout || 0,
            servername: undefined
        };
        if (this.proxy.username || this.proxy.password) {
            const base64 = Buffer.from(`${decodeURIComponent(this.proxy.username || '')}:${decodeURIComponent(this.proxy.password || '')}`).toString('base64');
            requestOptions.headers['proxy-authorization'] = `Basic ${base64}`;
        }
        if (this.proxy.protocol === 'https:') {
            requestOptions.servername = this.proxy.hostname;
        }
        const request = (this.proxy.protocol === 'http:' ? http : https).request(requestOptions);
        request.once('connect', (response, socket, head) => {
            request.removeAllListeners();
            socket.removeAllListeners();
            if (response.statusCode === 200) {
                callback(null, socket);
            }
            else {
                socket.destroy();
                callback(new Error(`Bad response: ${response.statusCode}`), null);
            }
        });
        request.once('timeout', () => {
            request.destroy(new Error('Proxy timeout'));
        });
        request.once('error', err => {
            request.removeAllListeners();
            callback(err, null);
        });
        request.end();
    }
}
export class HttpsProxyAgent extends https.Agent {
    constructor(options) {
        const { proxy } = options, opts = __rest(options, ["proxy"]);
        super(opts);
        this.keepAlive = options.keepAlive;
        this.proxy = typeof proxy === 'string'
            ? new URL(proxy)
            : proxy;
    }
    createConnection(options, callback) {
        const requestOptions = {
            method: 'CONNECT',
            host: this.proxy.hostname,
            port: this.proxy.port,
            path: `${options.host}:${options.port}`,
            setHost: false,
            headers: { connection: this.keepAlive ? 'keep-alive' : 'close', host: `${options.host}:${options.port}` },
            agent: false,
            timeout: options.timeout || 0,
            servername: undefined
        };
        if (this.proxy.username || this.proxy.password) {
            const base64 = Buffer.from(`${decodeURIComponent(this.proxy.username || '')}:${decodeURIComponent(this.proxy.password || '')}
      `).toString('base64');
            requestOptions.headers['proxy-authorization'] = `Basic ${base64}`;
        }
        if (this.proxy.protocol === 'https:') {
            requestOptions.servername = this.proxy.hostname;
        }
        const request = (this.proxy.protocol === 'http:' ? http : https).request(requestOptions);
        request.once('connect', (response, socket, head) => {
            request.removeAllListeners();
            socket.removeAllListeners();
            if (response.statusCode === 200) {
                try {
                    const secureSocket = super.createConnection(Object.assign(Object.assign({}, options), { socket }));
                    callback(null, secureSocket);
                }
                catch (err) {
                    socket.destroy();
                    callback(err, null);
                }
            }
            else {
                socket.destroy();
                callback(new Error(`Bad response: ${response.statusCode}`), null);
            }
        });
        request.once('timeout', () => {
            request.destroy(new Error('Proxy timeout'));
        });
        request.once('error', err => {
            request.removeAllListeners();
            callback(err, null);
        });
        request.end();
    }
}
//# sourceMappingURL=hpagent.js.map