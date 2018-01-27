var express = require("express");
var alexa = require("alexa-app");
module.change_code = 1;
var gcm = require("node-gcm");

var PORT = process.env.PORT || 8080;
var app = express();

// ALWAYS setup the alexa app and attach it to express before anything else.
var alexaApp = new alexa.app("robot");

alexaApp.express({
  expressApp: app,
  //router: express.Router(),

  // verifies requests come from amazon alexa. Must be enabled for production.
  // You can disable this if you're running a dev environment and want to POST
  // things to test behavior. enabled by default.
  checkCert: false,

  // sets up a GET route when set to true. This is handy for testing in
  // development, but not recommended for production. disabled by default
  debug: true
});

// now POST calls to /test in express will be handled by the app.request() function

// from here on you can setup any other express routes or middlewares as normal
app.set("view engine", "ejs");

const gcmServerKey = "AAAA4RsNXKo:APA91bGlYpjjYAbSdEBbmzmZgYmiT6DCybujGwY1BkwwltiHnvVWP24_ey-l49BAF3PJdd0VWOovNihEMIFH2qwr__Mfc7vH-a0_ZgE8pLig1K_9M6qqokFK9yHXFBM9LmnpDGOL6UE2";
const registrationToken = "c85fiBwP_Ow:APA91bEhu1sxuRkp6NSXUlxU_bHoOafrPgJyXnZ6jCTwzZeqA8GuKPbSt9IqDWreiistF7YcmlLsv9mer0BZkNzSmsY5oXb1HiELlt2_gW7UJemtEyms4UPRvmhGEj5CvOoNBCqVYknQ";

var sender = new gcm.Sender(gcmServerKey);
var registrationTokens = [registrationToken];

var n = ["north", "forward", "up"];
var ne = ["north east"];
var e = ["east", "right"];
var se = ["south east"];
var s = ["south", "back", "backward", "reverse", "down"];
var sw = ["south west"];
var w = ["west", "left"];
var nw = ["north west"];

// index is a code
var directionsCodes = [n, ne, e, se, s, sw, w, nw];
var directions = [].concat.apply([], directionsCodes);

function directionToCode(direction) {
  for (var i = 0; i < directionsCodes.length; i++) {
    for (var j = 0; j < directionsCodes[i].length; j++) {
      if (directionsCodes[i][j] == direction) {
        return i;
      }
    }
  }
  return -1;
}

var lightsCode = 9;

alexaApp.dictionary = {
  "directions": directions
};

alexaApp.launch(function(request, response) {
  response.shouldEndSession(false);
  console.log("Session started");
  response.say("Welcome to robot control application!");
});

alexaApp.sessionEnded(function(request, response) {
  console.log("Session ended");
});

alexaApp.intent("RobotDialogIntent", {
    "slots": { "DIRECTION": "LITERAL" },
    "utterances": [
      "move {directions|DIRECTION}",
      "move to {directions|DIRECTION}",
      "go {directions|DIRECTION}",
      "go to {directions|DIRECTION}"
    ]
  },
  function(request, response) {
    response.shouldEndSession(false);
    var direction = request.slot("DIRECTION");
    var directionCode = directionToCode(direction);
    var canonicalDirection = directionsCodes[directionCode][0];
    var message = new gcm.Message({
        data: { code: directionCode }
    });
    sender.send(message, { registrationTokens: registrationTokens }, function (err, data) {
        if (err) {
          console.error(err);
          response.say("Sorry, there was an unexpected error. Could not send message to robot.");
        } else {
          console.log(data);
          if (request.hasSession()) {
            var session = request.getSession();
            var counter = session.get(canonicalDirection);
            if (counter == null) {
              counter = 1;
            } else {
              counter = parseInt(counter) + 1;
            }
            session.set(canonicalDirection, counter.toString());
          }
          response.say("Moving the robot to " + canonicalDirection);
        }
        response.send();
    });
    return false;
  }
);

alexaApp.intent("RobotLightsIntent", {
    "utterances": [
      "{toggle|switch|} lights"
    ]
  },
  function(request, response) {
    response.shouldEndSession(false);
    var message = new gcm.Message({
        data: { code: lightsCode }
    });
    sender.send(message, { registrationTokens: registrationTokens }, function (err, data) {
        if (err) {
          console.error(err);
          response.say("Sorry, there was an unexpected error. Could not send message to robot.");
        } else {
          console.log(data);
          response.say("Toggling lights");
        }
        response.send();
    });
    return false;
  }
);

alexaApp.intent("RobotStatsIntent", {
    "utterances": [
      "{tell|give|say} {me|} stats",
    ]
  },
  function(request, response) {
    response.shouldEndSession(false);
    if (request.hasSession()) {
      var session = request.getSession();
      console.log(session.details.attributes);
      var stats = "";
      for (var key in session.details.attributes) {
        var counter = session.get(key);
        stats += ", " + key + " " + counter;
      }
      if (stats.length > 0) {
        response.say("The stats are " + stats);
      } else {
        response.say("No moves, yet");
      }
    } else {
      response.say("Sorry, session is not active, no stats are available");
    }
  }
);

alexaApp.intent("RobotStopIntent", {
    "utterances": [
      "{exit|quit|stop|end|bye}",
    ]
  },
  function(request, response) {
    response.say("It was a real pleasure talking to you. Have a good day!");
  }
);

module.exports = app;


app.listen(PORT, () => console.log("Listening on port " + PORT + "."));