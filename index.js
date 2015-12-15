#!/usr/bin/env node
"use strict"

var fs = require("fs");
var util = require("util");
var config = require("./lib/config.js"); // blocking lib
var JSON5 = require("json5");

// clean healpers
//
var _ = {
  extend: util._extend,
  format: util.format,
  exec: require("child_process").spawnSync,
  post: require("request").post
};

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
  live: false,
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
    var prev_json = JSON5.parse(prev_standup);

    // add Today to Yesterday ~ ?? more parsing
    prev_json.yesterday = [].concat(prev_json.yesterday, "// -----", prev_json.today);

    // default to false unless already posted
    prev_json.live = config.standup_json ? true : false;

    // create new standup file using JSON5 to unquote keys
    fs.writeFileSync(config.standup_file, JSON5.stringify(prev_json, null, 2), "utf8");
  }
}
else {
  // create one from scratch and open it
  fs.writeFileSync(config.standup_file, JSON5.stringify(blank_standup, null, 2), "utf8");
}

// launch editor
var editor = _.exec(config.editor, [].concat(config.editor_args, config.standup_file), {stdio: "inherit"});

// failed to launch editor
if (editor.status !== 0) {
  // if not ok - exit (gives user feed back on parse errors)
  console.log(_.format("Error: trying to launch editor: `%s %s %s`", config.editor, config.editor_args.join(" "), config.standup_file));
  process.exit(1);
}

// parse standup file
var standup = fs.readFileSync(config.standup_file, {encoding: "utf8"});
var standup_json = {};
try {
  standup_json = JSON5.parse(standup);
}
catch(e) {
  // if not ok - exit (gives user feed back on parse errors)
  console.log(_.format("Error# parsing standup file :%s", e.message).replace(/:/, "'").replace(/:/, "'").replace(/#/, ":"));
  process.exit(1);
}

// fix values ... make object for postMessage
var new_standup = _.extend({channel: config.channel, as_user: config.user, text: standup_json.text.join("\n")}, attachments);

// properties
["breakfast", "yesterday", "today", "jira", "blockers"].forEach(function(prop, i) {
  // remove commented values
  var values = standup_json[prop]
    .filter(function(v) {
      return !(/^(?:#[#-]|\/\/|\/[*])/.test(v));
    })
    .map(function(v, i) {
      return v
        .replace(/^[*][ ]/, "\u2022 ") // bullets
        .replace(/^[-][ -]/, "\u2013 ") // en-dash
        .replace(/^[#][ .]/, _.format("%s. ", (i+1))) // numbers
      ;
    });
  // use commas for the first and line-ends for the rest
  new_standup.attachments[i].fields[0].value = values.join(i ? "\n" : ", ");
});

// WTF ~ this took me awhile to figure out and then remember (later)!! Need to abstract this!!
new_standup.attachments = JSON.stringify(new_standup.attachments);

// postMessage or update or delete
var post_url = "https://slack.com/api/chat.postMessage?token=" + config.slack_token;
if (config.standup_ts_json) {
  if (standup_json.live) {
    post_url = post_url.replace(/postMessage/, "update");
    _.extend(new_standup, config.standup_ts_json);
  }
  else {
    post_url = post_url.replace(/postMessage/, "delete");
    new_standup = _.extend({}, config.standup_ts_json);
  }
}
else {
  if (!standup_json.live) {
    console.log("Standup Not Sent! Note: the 'live' property must be true.");
    process.exit(2);
  }
}

// do it
_.post(post_url, {form: new_standup}, function(err, resp, body) {
  var response_json = JSON.parse(body);
  if (response_json.ok) {
    if (standup_json.live) {
      fs.writeFileSync(config.standup_ts_file, JSON.stringify({ts: response_json.ts, channel: response_json.channel}), "utf8");
      console.log(_.format("Standup %s! [channel: '%s']", (config.standup_ts_json ? "Updated" : "Sent"), config.channel));
    }
    else if (config.standup_ts_json) {
      fs.unlinkSync(config.standup_ts_file);
      console.log(_.format("Standup Deleted! [channel: '%s']", config.channel));
    }
  }
  else {
    if (response_json.error === 'message_not_found') {
      fs.unlinkSync(config.standup_ts_file);
      console.log("Standup Not Send! Note: the original messge was probably deleted manually. Re-run and try again.");
      process.exit(2);
    }
  }
});
