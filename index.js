var fs = require("fs");
var config = require("./lib/config.js"); // blocking lib
var spawnSync = require("child_process").spawnSync;
var request = require("request");
var JSON5 = require("json5");

// attachments object with specific sections and colors (mod your colors here)
var attachments = {
  attachments: [
    {fallback: "Breakfast", color: "#000000", fields: [{title: "Breakfast", value: ""}]},
    {fallback: "Yesterday", color: "#F37321", fields: [{title: "Yesterday", value: ""}]},
    {fallback: "Today",     color: "#57BA47", fields: [{title: "Today",     value: ""}]},
    {fallback: "JIRA",      color: "#005593", fields: [{title: "JIRA",      value: ""}]},
    {fallback: "Blockers",  color: "#CC0000", fields: [{title: "Blockers",  value: ""}]}
  ]
};

// blank standup file for first time ...
var blank_standup = {
  live: true,
  text: ["*Status Update*"],
  breakfast: ["* "],
  yesterday: ["* ", "* "],
  today: ["* ", "* "],
  jira: ["* <https://jira.walmart.com/browse/SASCUI-1|SASCUI-1> Header"],
  blockers: ["* None, on track"]
};

// found a template in the standup directory
if (config.prev_standup) {
  // not today ... create standup file
  //
  if (!config.prev_today) {
    // open - move things around - add syntax format update config
    var prev_standup = fs.readFileSync(config.prev_standup, {encoding: "utf8"});

    // TODO: try/catch ... fails use blank ?? (shouldn't fail)
    var prev_object = JSON5.parse(prev_standup);

    // add Today to Yesterday ~ ?? more parsing
    prev_object.yesterday = [].concat(prev_object.yesterday, "// -----", prev_object.today);

    // create new standup file
    fs.writeFileSync(config.standup, JSON5.stringify(prev_object, null, 2) + "\n\n// vi:syntax=javascript", "utf8");
  }
}
else {
  // create one from scratch and open it
  fs.writeFileSync(config.standup, JSON5.stringify(blank_standup, null, 2) + "\n\n// vi:syntax=javascript", "utf8");
}

// launch editor
spawnSync(config.editor, [].concat(config.editor_args, config.standup), {stdio: "inherit"});

// parse standup file
var standup = fs.readFileSync(config.standup, {encoding: "utf8"});
var standup_object = {};
try {
  standup_object = JSON5.parse(standup);
}
catch(e) {
  // if not ok - exit (gives user feed back on parse errors)
  console.log(util.format("Error# parsing standup file :%s", e.message).replace(/:/, "'").replace(/:/, "'").replace(/#/, ":"));
  process.exit(1);
}

// fix values ... make object for postMessage
var new_message = config.extend({channel: config.channel, as_user: config.user, text: standup_object.text.join("\n")}, attachments);

// properties
["breakfast", "yesterday", "today", "jira", "blockers"].forEach(function(prop, i) {
  // remove commented values
  var values = standup_object[prop]
    .filter(function(v) {
      return !(/^(?:#[#-]|\/\/|\/[*])/.test(v));
    })
    .map(function(v, i) {
      return v
        .replace(/^[*][ ]/, "\u2022 ")          // bullets
        .replace(/^[#][ .]/, "" + (i+1) + ". ") // numbers
        .replace(/^[-][ -]/, "\u2013 ")         // en-dash
      ;
    });
  // use commas for the first and line-ends for the rest
  new_message.attachments[i].fields[0].value = values.join(i ? "\n" : ", ");
});

// WTF ~ this took me awhile to figure out and then remember (later)!! Need to abstract this!!
new_message.attachments = JSON.stringify(new_message.attachments);

// postMessage or update or delete
var post_url = "https://slack.com/api/chat.postMessage?token=" + config.slack_token;
if (config.standup_json) {
  if (standup_object.live) {
    post_url = post_url.replace(/postMessage/, "update");
    config.extend(new_message, config.standup_json);
  }
  else {
    post_url = post_url.replace(/postMessage/, "delete");
    new_message = config.extend({}, config.standup_json);
  }
}
else {
  if (!standup_object.live) {
    console.log("Not Sent!! Note: the 'live' property must be true.");
    process.exit(2);
  }
}

// do it
request.post(post_url, {form: new_message}, function(err, resp, body) {
  var response_json = JSON.parse(body);
  if (response_json.ok) {
    if (standup_object.live) {
      fs.writeFileSync(config.standup.replace(/\.txt$/, ".json"), JSON.stringify({ts: response_json.ts, channel: response_json.channel}), "utf8");
      console.log("Standup " + (config.standup_json ? "Updated!" : "Sent!"));
    }
    else if (config.standup_json) {
      fs.unlinkSync(config.standup.replace(/\.txt$/, ".json"));
      console.log("Standup deleted!");
    }
  }
});
