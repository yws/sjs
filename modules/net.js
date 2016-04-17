'use strict';

const errno = require('errno');
const _gai = require('_gai');
const _socket = require('_socket');


function Socket(domain, type, protocol, fd) {
    var protocol = protocol >>> 0;

    if (fd && fd > -1) {
        this._fd = fd;
    } else {
        this._fd = _socket.socket(domain, type, protocol);
    }
    this._domain = domain;
    this._type = type;
    this._proto = protocol;

    // set finalizer
    Duktape.fin(this, socketDealloc);

    Object.defineProperty(this, 'fd', {
        get: function() {
            return this._fd;
        }
    });
}


Socket.prototype.accept = function() {
    checkSocket.call(this);
    var fd = _socket.accept(this._fd);
    return new Socket(this._domain, this._type, this._proto, fd);
}


Socket.prototype.bind = function(address) {
    checkSocket.call(this);
    _socket.bind(this._fd, normalizeAddress(this._domain, address));
}


Socket.prototype.close = function() {
    if (this._fd !== -1) {
        _socket.close(this._fd);
        this._fd = -1;
    }
}


Socket.prototype.connect = function(address) {
    checkSocket.call(this);
    _socket.connect(this._fd, normalizeAddress(this._domain, address));
}


Socket.prototype.getsockname = function() {
    checkSocket.call(this);
    return _socket.getsockname(this._fd);
}


Socket.prototype.getpeername = function() {
    checkSocket.call(this);
    return _socket.getpeername(this._fd);
}


Socket.prototype.listen = function(backlog) {
    checkSocket.call(this);
    var backlog = backlog >>> 0;
    _socket.listen(this._fd, backlog);
}


Socket.prototype.recv = function(nread) {
    checkSocket.call(this);
    var nread = (nread >>> 0) || 4096;
    return _socket.recv(this._fd, nread);
}


Socket.prototype.send = function(data) {
    checkSocket.call(this);
    return _socket.send(this._fd, data);
}


Socket.prototype.recvfrom = function(nread) {
    checkSocket.call(this);
    var nread = (nread >>> 0) || 4096;
    return _socket.recvfrom(this._fd, nread);
}


Socket.prototype.sendto = function(data, address) {
    checkSocket.call(this);
    return _socket.sendto(this._fd, data, normalizeAddress(this._domain, address));
}


Socket.prototype.shutdown = function(how) {
    checkSocket.call(this);
    var how = how >>> 0;
    _socket.shutdown(this._fd, how);
}


function getaddrinfo(hostname, servname, hints) {
    var hints = hints || {};
    return _gai.getaddrinfo(hostname, servname, hints);
}


function isIPv4(address) {
    return _socket.inet_pton(_socket.c.AF_INET, address) !== undefined;
}


function isIPv6(address) {
    return _socket.inet_pton(_socket.c.AF_INET6, address) !== undefined;
}


function isIP(address) {
    if (isIPv4(address)) {
        return 4;
    } else if (isIPv6(address)) {
        return 6;
    } else {
        return 0;
    }
}


// - helpers

// finalizer: will get called when a Socket is garbage collected
function socketDealloc(sock) {
    if (sock._fd !== -1) {
        _socket.close(sock._fd);
    }
}


function checkSocket() {
    if (this._fd === -1) {
        const e = new Error('[Errno ' + errno.EBADF + '] ' + errno.strerror(errno.EBADF));
        e.errno = errno.EBADF;
        throw e;
    }
}


function normalizeAddress(domain, address) {
    var addr = address || {};

    if (domain === _socket.c.AF_UNIX) {
        if (typeof addr === 'string') {
            return {domain: _socket.c.AF_UNIX, path: addr};
        } else {
            throw new TypeError('invalid address');
        }
    } else {
        if (typeof addr !== 'object') {
            throw new TypeError('invalid address');
        }

        if (!addr.host) {
            addr.host = domain === _socket.c.AF_INET6 ? '::' : '0.0.0.0';
        }

        var iptype = isIP(addr.host);
        if (iptype === 0) {
            throw new Error('invalid IP address: ' + addr.host);
        } else if (iptype === 4) {
            addr.domain = _socket.c.AF_INET;
            addr.port = addr.port >>> 0;
        } else {
            addr.domain = _socket.c.AF_INET6;
            addr.port = addr.port >>> 0;
            addr.flowinfo = addr.flowinfo >>> 0;
            addr.scopeid = addr.scopeid >>> 0;
        }

        return addr;
    }
}


// - exports

module.exports = {
    Socket        : Socket,
    getaddrinfo   : getaddrinfo,
    gai_strerror  : _gai.gai_strerror,
    gai_error_map : new Map(),
    isIP          : isIP,
    isIPv4        : isIPv4,
    isIPv6        : isIPv6
};

// extract constants
for (var k in _gai.c) {
    var val = _gai.c[k];
    module.exports[k] = val;
    module.exports.gai_error_map.set(val, k);
}
for (var k in _socket.c) {
    module.exports[k] = _socket.c[k];
}