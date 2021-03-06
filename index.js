var request = require('request')
var pick = require('lodash.pick')
var async = require('async')

function CobudgetClient (params) {
  this.authHeaders = {}
  this.params = params
  this.baseUri = 'https://cobudget-beta-api.herokuapp.com/api/v1'
}

CobudgetClient.prototype.init = function (callback) {
  var self = this
  request.post({
    uri: self.baseUri + '/auth/sign_in',
    form: self.params
  }, function (err, response, body) {
    var headers = response.toJSON().headers
    self.authHeaders = pick(headers, ['access-token', 'uid', 'client', 'token-type'])
    callback()
  })
}

CobudgetClient.prototype.getItAll = function (groupId, callback) {
  var self = this
  async.parallel({
    me: self.getMe.bind(self),
    group: async.apply(self.getGroup.bind(self), groupId),
    buckets: async.apply(self.getBucketsForGroup.bind(self), {id: groupId}),
    allocations: async.apply(self.getAllocationsForGroup.bind(self), { id: groupId }),
    users: async.apply(self.getUsersForGroup.bind(self), { id: groupId })
  }, callback);
}

CobudgetClient.prototype.getMe = function (callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/users/me',
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    callback(null, JSON.parse(body).users[0]);
  });
}

CobudgetClient.prototype.getGroup = function (id, callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/groups/' + id,
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    callback(null, JSON.parse(body).groups[0]);
  });
}

CobudgetClient.prototype.getBucketsForGroup = function (group, callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/buckets?group_id=' + group.id,
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    var buckets = JSON.parse(body).buckets
    async.map(buckets, self.getActivityForBucket.bind(self), callback)
  });
}

CobudgetClient.prototype.getActivityForBucket = function (bucket, callback) {
  var self = this
  async.parallel({
    comments: async.apply(self.getCommentsForBucket.bind(self), bucket),
    contributions: async.apply(self.getContributionsForBucket.bind(self), bucket)
  }, function (err, results) {
    bucket.contributions = results.contributions
    bucket.comments = results.comments
    callback(null, bucket)
  })
}

CobudgetClient.prototype.getAllocationsForGroup = function (group, callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/allocations?group_id=' + group.id,
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    callback(null, JSON.parse(body).allocations);
  });
}

CobudgetClient.prototype.getContributionsForBucket = function (bucket, callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/contributions?bucket_id=' + bucket.id,
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    callback(null, JSON.parse(body).contributions);
  });
}

CobudgetClient.prototype.getCommentsForBucket = function (bucket, callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/comments?bucket_id=' + bucket.id,
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    callback(null, JSON.parse(body).comments);
  });
}

CobudgetClient.prototype.getUsersForGroup = function (group, callback) {
  var self = this
  request.get({
    uri: self.baseUri + '/memberships?group_id=' + group.id,
    headers: self.authHeaders
  }, function (err, response, body) {
    if (err) return callback(err);
    callback(null, JSON.parse(body).users);
  });
}

module.exports = CobudgetClient
