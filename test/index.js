"use strict";

var ViLowBaln = require('../index.js'),
    expect = require('expect.js');

describe('vilowbaln', function() {

    it('can register servers', function(done) {
        var vlb = new ViLowBaln(1, function(headers) { return headers['x-service']; }),
            requestNumber = 0,
            requests = [],
            i;

        var getRequestHander = function(ipPort) {
            return function(headers, body, next) {
                requests.push({
                    ipPort: ipPort,
                    headers: headers,
                    body: body,
                    requestId: requestNumber
                });
                next(null, 200, { requestId: requestNumber }, '<div>request: ' + requestNumber++ + '</div>');
            };
        };
        vlb.addServer('127.0.0.1:8001', ['web'], getRequestHander('127.0.0.1:8001'));
        vlb.addServer('127.0.0.1:8002', ['web'], getRequestHander('127.0.0.1:8001'));
        vlb.addServer('127.0.0.1:4321', ['db'], getRequestHander('127.0.0.1:4321'));
        expect(vlb.listServerClasses()).to.eql(['web', 'db']);
        expect(vlb.listServer('web')).to.eql(['127.0.0.1:8001', '127.0.0.1:8002']);
        expect(vlb.listServer('db')).to.eql(['127.0.0.1:4321']);

        var data = ['web', 'web', 'web', 'db', 'db'];

        var getResponseChecker = function(rn) {
            return function(err, status, headers, body) {
                expect(err).to.equal(null);
                expect(status).to.equal(200);
                expect(headers.requestId).to.equal(rn);
                expect(body).to.match(/<div/);
                if (requests.length === 5) {
                    setTimeout(function() {
                        done();
                    }, 10);
                }
            };
        };

        for (i = 0; i < data.length; i++) {
            vlb.request(
                {'x-service': data[i]},
                { rn: i },
                getResponseChecker(i)
            );
        }

    });

});
