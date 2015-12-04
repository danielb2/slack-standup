Installation
------------

Requirements:

These are the environment variables, file and directory requirements. Go to setup and follow those
steps to setup your system.

    1. ENV['HOME'] directory
        a) this should already be set type: env to see your environment variables

    2. ENV['EDITOR'] or add to .slackrc.json as "editor". EX: "/usr/bin/vim"
        a)  edit your shell's rc file - Ex: .bashrc
            export EDITOR="subl -w"
            ----- or ---- 
            export EDITOR="vim"

    3. $HOME/.standup directory
        a) need to create

    4. $HOME/.slackrc.json file - has to be valid JSON
        a) need to create


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

    2. Comments in standup JSON file:
        a) // commented lines are ignored and not ported to the next day
        b) "// commented strings" are ignored for POST'ing but saved in the JSON

    3. Today to Yesterday:
        a) When used daily, Today's lists are automattically appended to Yesterday's list

    4. Update Standup:
        a) Re-run, edit and save; it will update the post with the new data

    5. Delete Standup:
        a) You can do it via the application or
        b) Re-run, change 'live' to false and quit; it will remove the post
