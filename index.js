require('dotenv').config();
var express = require('express');
var cors = require('cors');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('node:dns');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

var port = process.env.PORT || 3000;

var linkSchema = new mongoose.Schema({
  source_url: { type: String, required: true, unique: true },
  short_code: { type: String, required: true, unique: true }
});

var Link = mongoose.model("link", linkSchema);

app.use("/", bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:code', function(req, res) {
  var code = req.params.code;
  Link.findOne({ short_code: code }).then(function(found) {
    if (found) {
      var redirectUrl = found.source_url;
      res.redirect(redirectUrl);
    } else {
      res.json({ message: "This URL does not exist." });
    }
  });
});

app.post('/api/shorturl', function(req, res) {
  var input = req.body.url;
  try {
    var parsed = new URL(input);
    dns.lookup(parsed.hostname, function(err, address, family) {
      if (!address) {
        res.json({ error: 'invalid url' });
      } else {
        var source = parsed.href;
        Link.findOne({ source_url: source }).then(function(existing) {
          if (existing) {
            res.json({
              original_url: existing.source_url,
              short_url: existing.short_code
            });
          } else {
            var shortCode = 1;
            Link.find({}).sort({ short_code: "desc" }).limit(1).then(function(latest) {
              if (latest.length > 0) {
                shortCode = parseInt(latest[0].short_code) + 1;
              }
              var responseObj = {
                original_url: source,
                short_url: shortCode
              };
              var record = new Link({
                source_url: responseObj.original_url,
                short_code: responseObj.short_url
              });
              record.save();
              res.json(responseObj);
            });
          }
        });
      }
    });
  } catch {
    res.json({ error: 'invalid url' });
  }
});

app.listen(port, function() {
  console.log('Listening on port ' + port);
});
