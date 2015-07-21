"use strict";
let maxim = require(global.BASEPATH + 'modules/maxim');
/** A module containing some fun classes that work together to assist handling HTTP requests
 * @module routed
 */

//TODO: If I have time, make a route class.  It's a little awkward as is.
/** A class the handles mapping and finding routes to handle exchanges between client and server
 * @class Route
 * @ignore
 */

/**
 * A RequestHandler that reqirects to appropriate route or responds with error
 * @function routeRequest
 * @type RequestHandler
 */

/**
 * A class holding a request method type, regex path into, and a function to handle requests
 * @ignore
 * @function Route
 * @param {string} method - Type of http request ('GET', 'PUT', 'DELETE', 'POST')
 * @param {string} regex - Regex to match url path, similar to express
 * @param {RequestHandler} handler - RequestHandler function for the route
 */


{
  // Require modules needed for class
  let fs = require('fs');
  let path = require('path');

  // Private properties and methods
  let _properties = new WeakMap();

  /** A class the handles mapping and finding routes to handle exchanges between client and server
   * @class Router
   */
  var Router = class Router {
    /**
     * A class the handles mapping and finding routes to handle exchanges between client and server
     * @memberof module:routed~Router
     * @constructs module:routed~Router
     */
    constructor() {
      let privateProperties = {
        /**
         * Holds the routes so they can be looked up more quickly
         * @memberof module:routed~Router
         * @instance
         * @private
         * @type {Object} routeMap
         */
        routeMap: {
          'GET': {},
          'PUT': {},
          'POST': {},
          'DELETE': {}
        }
      };
      _properties.set(this, privateProperties);
    }

    /**
     * Maps a Route in the router
     * @memberof module:routed~Router
     * @function mapRoute
     * @param {Route} route - A route
     * @instance

     */
    mapRoute(route) {
      let method = route.method;
      let regex = route.regex;
      let handler = route.route;
      _properties.get(this).routeMap[method]['^' + regex.replace(/[\\$'"]/g, "\\$&") + '$'] = handler;
    }

    /**
     * Maps an array of Routes in the router
     * @function mapRoutes
     * @param {Route[]} routes - An array of routes
     * @instance
     * @memberof module:routed~Router
     */
    mapRoutes(routes) {
      if (Array.isArray(routes)) {
        for (var i = 0; i < routes.length; ++i) {
          this.mapRoute(routes[i]);
        }
      } else {
        this.mapRoute(routes);
      }
    }

    /**
     * Recursively loads all routes in given directory
     * @function initRouteDirectory
     * @param {String} routesPath - path to routes
     * @instance
     * @memberof module:routed~Router
     */
    initRouteDirectory(routesPath) {
      let _this = this;
      if (!path.isAbsolute(routesPath)) {
        routesPath = global.BASEPATH + routesPath.substring(1);
      }
      if (routesPath[routesPath.length - 1] !== '/') {
        routesPath = routesPath.concat('/');
      }
      var routeFiles = fs.readdirSync(routesPath).filter(function(file) {
        return path.extname(file) === '.js';
      }).map(file => routesPath + file);

      function walk(recursePath) {
        var dirs = fs.readdirSync(recursePath).filter(function(file) {
          return fs.statSync(path.join(recursePath, file)).isDirectory();
        });
        dirs.forEach(function(dir) {
          dir += '/';
          routeFiles = routeFiles.concat(fs.readdirSync(recursePath + dir)
            .filter(file => path.extname(file) === '.js')
            .map(file => routesPath + dir + file));
          walk(recursePath + dir);
        });
      }
      walk(routesPath);
      maxim.info('Loading routes:', routeFiles);
      routeFiles.forEach(function(file) {
        _this.mapRoutes(require(file));
      });
    }

    /**
     * Finds and returns a Route matching given method and path, or a default Route
     * @function findRoute
     * @param {String} method - Valid HTTP request method
     * @param {String} path - path of request
     * @returns {Promise} Promise that resolves with {statusCode, headers, and body}
     * @instance
     * @memberof module:routed~Router
     */
    findRoute(method, path) {
      let routeMap = _properties.get(this).routeMap;
      for (var regexStr of Object.keys(routeMap[method])) {
        let regex = new RegExp(regexStr, 'm');
        maxim.info(regexStr, path);
        if (regex.test(path)) {
          return routeMap[method][regexStr];
        }
      }
      return new Promise(function(resolve) {
        resolve({
          statusCode: 400,
          headers: {},
          body: 'Invalid Request'
        });
      });
    }
  };
}

{
  // Require modules needed for class
  let urlParser = require('url').parse;

  // Private properties and methods
  let _properties = new WeakMap();
  let _methods = new WeakMap();

  /** A class that represents a single HTTP request/reponse and simplies the API for client/server communication
   * @class module:routed~Exchange
   */
  var Exchange = class Exchange {
    /**
     * Creates a new Exchange instance
     * @memberof module:routed~Exchange
     * @constructs
     * @param {http.IncomingMessage} request - client request
     * @param {http.ServerResponse} response - response object to reply appropriately
     */
    constructor(request, response) {
      let _this = this;
      let parsedUrl = urlParser(request.url, true);
      let privateProperties = {
        /**
         * Holds node http.IncomingMessage object
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {http.IncomingMessage} httpRequest
         */
        httpRequest: request,
        /**
         * Holds node http.ServerResponse object
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {http.ServerResponse} httpResponse
         */
        httpResponse: response,
        /**
         * Holds request info retrieved from httpRequest
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {Object} requestInfo
         */
        requestInfo: {
          method: request.method,
          headers: request.headers,
          path: parsedUrl.pathname,
          params: {},
          query: parsedUrl.query,
          body: null
        },
        /**
         * Holds body of incoming request
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {Object} requestBody
         */
        requestBody: '',
        /**
         * HTTP status that will be sent to client
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {Number} responseStatus
         */
        responseStatus: 500,
        /**
         * Header that will be sent to client
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {Object} responseHeaders
         */
        responseHeaders: {},
        /**
         * Data that will be sent to client
         * @memberof module:routed~Exchange
         * @instance
         * @private
         * @type {Object} responseBody
         */
        responseBody: {},
      };
      let privateMethods = {
        /**
         * Processes and collects info from the HTTP request
         * @memberof module:routed~Exchange
         * @instance
         * @function processPayload
         * @private
         * @param {http.IncomingMessage} request - The HTTP request
         * @returns {Promise} Resolves with request body as JSON
         */
        processPayload: function(request) {
          maxim.info('IN PAYLOAD Function!');
          return new Promise((resolve, reject) => {
            maxim.info('IN PAYLOAD PROMISE!');
            let requestBody = null;
            var finished = function() {
              maxim.info('RESOLVING PAYLOAD PROMISE!');
              resolve(requestBody);
            };
            var error = function(e) {
              maxim.info('RESOLVING PAYLOAD PROMISE!');
              reject(e);
            };
            let requestData = [''];
            if (request.method === 'POST' || request.method === 'PUT') {
              request.on('data', data => requestData.push(data));
              request.on('end', () => {
                requestBody = JSON.parse(requestData.join(''));
                _properties.get(_this).requestInfo.body = requestBody;
                finished();
              });
              request.on('error', e => error(e));
            } else {
              finished();
            }
          });
        },
        /**
         * Sents response to client and closes the Exchange
         * @memberof module:routed~Exchange
         * @instance
         * @function send
         * @private
         */
        send: function() {
          maxim.info('SENDING PAYLOAD!');
          let httpResponse = _properties.get(_this).httpResponse;
          let headers = _properties.get(_this).responseHeaders;
          let code = _properties.get(_this).responseStatus;
          let message = Exchange.statusMessage(code);
          let payload = _properties.get(_this).responseBody;

          function finished() {
            maxim.info('EXCHANGE FINISHED');
          }

          if (payload) {
            if (typeof payload === 'object') {
              payload = JSON.stringify(payload);
            }
            _this.addHeader('Content-Type', 'application/json');
            _this.addHeader('Content-Length', payload.length);
            httpResponse.writeHead(code, message, headers);
            _properties.get(_this).httpResponse.end(payload);
            finished();
          } else {
            httpResponse.end();
            finished();
          }
        }
      };
      privateMethods.processingPromise = privateMethods.processPayload(request);
      _properties.set(this, privateProperties);
      _methods.set(this, privateMethods);
    }

    /**
     * Returns message of any HTTP status code
     * @memberof module:routed~Exchange
     * @function statusMessage
     * @static
     * @param {Number} code - A HTTP status code
     * @returns {String} Message associated with code
     */
    static statusMessage(code) {
      let codeMessages = {
        200: 'OK',
        500: 'Unexpected Error'
      };
      if (code in codeMessages) {
        return codeMessages[code];
      } else {
        return 'Undefined Status Code';
      }
    }

    /**
     * Set the RequestHandler that should handle setting up the response
     * @memberof module:routed~Exchange
     * @instance
     * @function handleResponse
     * @param {RequestHandler} handler - The RequestHandler that should handle the response
     */
    handleResponse(handler) {
      // Speed up calls to hasOwnProperty
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      let _this = this;
      let requestInfo = this.requestInfo;
      maxim.info('WAITING ON PROMISE!');
      _methods.get(this).processingPromise.then(() => {
        maxim.info('PL PROMISE RESOLVED!');
        handler(requestInfo, requestInfo.query, requestInfo.body).then(function(response) {
          maxim.info('HANDLE PROMISE RESOLVED!');
          maxim.info(response);
          _properties.get(_this).responseStatus = response.statusCode;
          _this.addHeaders(response.headers);
          _properties.get(_this).responseBody = response.body;

          maxim.info('SENDING!');
          _methods.get(_this).send();
        }).catch(e => {
          maxim.info('HANDLE PROMISE ERROR!');
          _properties.get(_this).responseStatus = 500;
          _this.throwError(e);
          maxim.info('SENDING!');
          _methods.get(_this).send();
        });
      }).catch(e => {
        maxim.error('PL PROMISE ERROR!');
        maxim.info(handler);
        _properties.get(_this).responseStatus = 500;
        _this.throwError(e);
        maxim.info('SENDING!');
        _methods.get(_this).send();
      });
    }

    /**
     * Adds a header to send with the response
     * @memberof module:routed~Exchange
     * @instance
     * @function addHeader
     * @param {String} key - key of header
     * @param {String} value - value of header
     */
    addHeader(key, value) {
      _properties.get(this).responseHeaders[key] = value;
    }

    /**
     * Adds headers to send with the response
     * @memberof module:routed~Exchange
     * @instance
     * @function addHeaders
     * @param {Object} headers - object holding key=>value pairs of header info
     */
    addHeaders(headers) {
      for (var key of Object.keys(headers)) {
        this.addHeader(key, headers[key]);
      }
    }

    throwError(code, message) {
      maxim.info('not impliminetnedfjklndsfkdj', code, message);
    }

    /**
     * Request information
     * @memberof module:routed~Exchange
     * @instance
     * @readonly
     * @type {Object}
     */
    get requestInfo() {
      return _properties.get(this).requestInfo;
    }

    /**
     * Status of response
     * @memberof module:routed~Exchange
     * @instance
     * @readonly
     * @type {Number}
     */
    get statusCode() {
      return _properties.get(this).statusCode;
    }

    /**
     * Object of headers.
     * @memberof module:routed~Exchange
     * @instance
     * @readonly
     * @type {Object}
     */
    get headers() {
      return _properties.get(this).responseHeaders;
    }

    /**
     * Payload to send as response body
     * @memberof module:routed~Exchange
     * @instance
     * @readonly
     * @type {Object}
     */
    get body() {
      return _properties.get(this).responseBody;
    }
  };
}

module.exports = {
  Router: Router,
  Exchange: Exchange,
  //Route: Route
};