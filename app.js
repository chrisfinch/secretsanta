
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path');

// Database
var databaseUrl = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "santa";
var collections = ["users", "pairs"];
var db = require('mongojs').connect(databaseUrl, collections);

// Email
var email = require("emailjs");
var fs = require("fs");
var config = JSON.parse(fs.readFileSync('./email-config.json', 'utf-8'));
var server = email.server.connect({
  user: config.username,
  password: config.password,
  host: config.smtp.host,
  ssl: config.smtp.ssl
});

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var sendJoinEmail = function (query, cb) {
  var text = [];
  text.push("Hi "+query.name+", \r\n\r\n");
  text.push("This is a conformation that you have been entered in to the R&D South Secret Santa draw. \r\n\r\n");
  text.push("When signups are complete you will recieve an email letting you know who your secret santa is.\r\n\r\n");
  text.push("Thanks and merry Christmas!");

  var message = email.message.create({
    text: text.join(''),
    from: config.name+" <"+config.email+">",
    to: query.name+" <"+query.email+">",
    subject: "R&D South Secret Santa registration"
  });

  server.send(message, cb);
};

var register = function (req, res) {
   db.users.find({email: req.query.email}, function (err, users) {
    if (users.length === 0) {
      db.users.save({
        name: req.query.name,
        email: req.query.email
      }, function (err, saved) {
        if( err || !saved ) {
          res.send(500, "The database is broke, try again later...");
        } else {
          sendJoinEmail(req.query, function (err, message) {
            if (err) {
              res.send(500, "Your entry was saved, but an email could not be sent - sorry about that.");
            } else {
              res.send(200, { name: req.query.name, email: req.query.email});
            }
          });
        }
      });
    } else {
      res.send(500, "Naughty naughty, that email has already been used - only 1 gift each.");
    }
   });
};

var shuffle = function ( myArray ) {
  var i = myArray.length;
  if ( i === 0 ) return false;
  while ( --i ) {
     var j = Math.floor( Math.random() * ( i + 1 ) );
     var tempi = myArray[i];
     var tempj = myArray[j];
     myArray[i] = tempj;
     myArray[j] = tempi;
   }
};

var draw = function (req, res) {
  var pairs = [];
  db.users.find(function (err, users) {
    shuffle(users);
    while (users.length >1) {
      var pair = {
        1: users.shift(),
        2: users.shift()
      };
      pairs.push(pair);
    }
    db.pairs.drop(); // Avoids duplicates incase there was already something there
    db.pairs.save(pairs);
    res.redirect('/');
  });
};

var pairEmail = function (santa, santee) {
  var text = [];
  text.push("Hi "+santa.name+", \r\n\r\n");
  text.push("The R&D South Secret Santa draw has been held and you are now the secret santa for:\r\n\r\n");
  text.push("Name: " + santee.name + " at email: " + santee.email +"\r\n\r\n");
  text.push("Go out and buy them something for £5 or less! Remember to keep it a secret!\r\n\r\n");
  text.push(" - Enjoy and Merry xmas.");

  var message = email.message.create({
    text: text.join(''),
    from: config.name+" <"+config.email+">",
    to: santa.name+" <"+santa.email+">",
    subject: "R&D South Secret Santa Draw Result!!!!11"
  });

  server.send(message);
};

var send = function (req, res) {
  db.pairs.find(function (err, pairs) {
   console.log( pairs.length);
    for (var i=0;i<=pairs.length-1;i++) {
      var p = pairs[i];
      pairEmail(p["1"], p["2"]);
      pairEmail(p["2"], p["1"]);
    }
    res.redirect('/');
  });
};

// GET
app.get('/reg', register);
app.get('/draw', draw);
app.get('/send', send);
app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
