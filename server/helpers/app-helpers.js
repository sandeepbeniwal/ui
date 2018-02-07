var http = require('http');
var url = require('url');
var request = require('request');
var config = require('config');

exports.extend = function(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

exports.apiFullUrl = function(req, path) {
  var apiUrl = req.app.get('api-url');
  var httpurl = url.format(apiUrl) + path.replace(/^\//, "");
  return httpurl;
}

exports.getApiEndpoint = function(req, path, params, successcb, errorcb) {
  var url = exports.apiFullUrl(req, path);

  console.log("GET " + url + ", params: ", params);

  options = {url: url, qs: params}
  options = config.util.extendDeep({},options,config.fnApiOptions)
  options = exports.addAuth(options, req)

  request(options, function(error, response, body){exports.requestCB(successcb, errorcb, error, response, body)});
}

exports.postApiEndpoint = function(req, path, params, postfields, successcb, errorcb) {
  exports.execApiEndpoint('POST', req, path, params, postfields, successcb, errorcb);
}

exports.execApiEndpoint = function(method, req, path, params, postfields, successcb, errorcb) {
  var options = {
    uri: exports.apiFullUrl(req, path),
    method: method,
    json: postfields
  };

  console.log(options.method + " " + options.uri + ", params: ", options.body);

  options = exports.addAuth(options, req)

  request(options, function(error, response, body){exports.requestCB(successcb, errorcb, error, response, body)});
}

exports.execApiEndpointRaw = function(method, req, path, params, postfields, successcb, errorcb) {
  var options = {
    uri: exports.apiFullUrl(req, path),
    method: method,
    json: postfields
  };

  console.log(options.method + " " + options.uri + ", params: ", options.body);

  options = exports.addAuth(options, req)

  request(options, function(error, response, body){exports.requestCBRaw(successcb, errorcb, error, response, body)});
}

exports.addAuth = function(options, req) {
  if (req.get('Authorization') !== undefined) {
      options.headers = {
        'Authorization': req.get('Authorization')
      }
  }
  return options
}

// expects response as json
exports.requestCB = function (successcb, errorcb, error, response, body) {
  var parsed;
  if (!error && response.statusCode >= 200 && response.statusCode < 300) {
    try {
      if (typeof body == "string"){
        parsed = JSON.parse(body);
      } else {
        parsed = body;
      }
    } catch (e) {
      console.warn("Can not parse json:", body, e);
    };
    if (parsed){
      successcb(parsed);
    } else {
      errorcb(response.statusCode, "Can not parse api response");
    };
  } else {
    var message;
    try {
      if (typeof body == "string"){
        parsed = JSON.parse(body);
      } else {
        parsed = body;
      }
      if (parsed && parsed.error && parsed.error.message){
        message = parsed.error.message;
      }
    } catch (e) {
      message = "Can not parse api response";
    }
    message = message || "An error ocurred."
    var status = response ? response.statusCode : error.code;
    console.warn("[ERR] " + status + " | "  + message);
    errorcb(status, message);
  }
}

// expects response as plain text
exports.requestCBRaw = function (successcb, errorcb, error, response, body) {
  if (!error && response.statusCode >= 200 && response.statusCode < 300) {
    successcb(body);
  } else {
    var status = response ? response.statusCode : error.code;
    errorcb(status, body);
  }
}

exports.standardErrorcb = function(res){
  return function(status, err){
    console.log("Error. Api responded with ", status, err);
    var text = "Something went terribly wrong (Status Code: " + status + ") ";
    if (err){
      text = "Error: " + err;
    }
    res.status(400).json({msg: text});
  }
}
