"use strict";

var R = require('ramda');

var IPPORT = 0, CLS = 1, FUNC = 2,
    HEADERS = 0, BODY = 1, NEXT = 2;

var ViLowBaln = function(interval, serviceDecider) {
    this._servers = [];
    this._requestIndex = 0;
    this._q = [];
    this._processing = false;
    this._serviceDecider = serviceDecider;
    var that = this;
    setInterval(function() {
        if (that._processing || (that._q.length == 0)) { return; }
        that._processing = true;
        var req = that._q.shift();
        that._dispatch(req[HEADERS], req[BODY], function(err, status, headers, body) {
            req[NEXT](err, status, headers, body);
            that._processing = false;
        });
    }, interval);
};

ViLowBaln.prototype.addServer = function(ipPort, cls, func) {
    this._servers.push([ipPort, cls, func]);
};

ViLowBaln.prototype._dispatch = function(headers, body, next) {
    var cls = this._serviceDecider(headers, body),
        handlers = R.filter(
            function(serv) {
                return serv[CLS].indexOf(cls) > -1;
            },
            this._servers
        ),
        handler = handlers[this._requestIndex++ % handlers.length];
    if (!handler) {
        throw new Error("Could not find handler for " + cls);
    }
    handler[FUNC](headers, body, next);
};

ViLowBaln.prototype.request = function(headers, body, next) {
    this._q.push([headers, body, next]);
};

ViLowBaln.prototype.listServerClasses = function() {
    return R.uniq(
        R.flatten(
            R.map(
                function(ob) { return ob[CLS]; },
                this._servers
            )
        )
    );
};

ViLowBaln.prototype.listServer = function(cls) {
    return R.map(
        function(serv) { return serv[IPPORT]; },
        R.filter(
            function(serv) {
                return serv[CLS].indexOf(cls) > -1;
            },
            this._servers
        )
    );
};



module.exports = ViLowBaln;
