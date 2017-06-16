var path = require('path')
var express = require('express')
var app = express()

app.use(express.static('public'))

app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'))
})
app.get('/transit', function (request, response) {
  response.sendFile(path.join(__dirname, 'transit.html'))
})

var server = app.listen(8081, function () {
  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
