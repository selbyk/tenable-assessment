var esClient = require('../../modules/es-client');

module.exports = {
  method: 'POST',
  regex: '/auth/register',
  route: function(params, query, body){
    esClient.index('tenable', 'user', {
      _id: body.username,
      password: body.password
    });
    var payload = {
      message: 'fghfgh!'
    };
    return {statusCode: 200, headers: {}, body: payload};
  }
};
