var request = require('http').request;

module.exports = {
    indexDoc: function(_index, _type, doc) {
      var _id = null;
      if (doc.hasOwnProperty("_id")) {
        _id = doc._id;
        delete doc[_id];
      }
      var postData = JSON.stringify(doc);

      var options = {
        hostname: 'localhost',
        port: 9200,
        path: '/' + _index + '/' + _type,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      if (_id !== null) {
        options.path = options.path + '/' + _id;
        options.method = "PUT";
      }

      var req = request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
          console.log('BODY: ' + chunk);
        });
      });

      req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
      });

      // write data to request body
      req.write(postData);
      req.end();
      return postData;
    }
};