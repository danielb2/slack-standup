Installation
------------

Requirements:

    1. ENV['HOME'] directory
    2. ENV['EDITOR'] or add to .slackrc.json as "editor". EX: "/usr/bin/vim"
    3. $HOME/.standup directory
    4. $HOME/.slackrc.json file - has to be valid JSON


Setup:

Go here, scroll to the bottom and create OAuth token:
https://api.slack.com/web

    $ cd
    $ mkdir .startup
    $ vim .slackrc.json
      {
          "slack_token": "xxxx-DDDDDDDDDD-DDDDDDDDDDD-DDDDDDDDDDD-yyyyyyyyyy",
          "standup": {
                  "channel": "#bot-channel",
                  "user": "Display Name"
          }
      }
    $ cd /path/to/slack-standup
    $ npm install
    $ node index.js


Usage:

    $ node index.js


Tips and tricks
---------------

    1. Automatic Conversions:
       a) Stars (*) at the start of lines are converted to bullets
       b) Hash (#) at the start of the lines are converted to numbered lists
       c) Dash (-) at the start of lines are converted to endash

    2. Comments:
       a) // commented lines are ignored and not saved
       b) "// commented strings" are ignored but saved in the JSON

    3. Today to Yesterday:
       a) When used daily, Today's lists are automattically appended to Yesterday's list

