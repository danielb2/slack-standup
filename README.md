Latest Version
--------------

__NOTE__: I changed the file extension from .txt to .json. So all of your older files won't be found.
To fix just run `npm run-script rename` and the .txt files will be renamed to .json files.


Installation
------------

Requirements:

These are the environment variables, file and directory requirements. Go to setup and follow those
steps to setup your system.

    1. ENV['EDITOR'] or add to slackrc.json as "editor". EX: "/usr/bin/vim"
        a) edit your shell's rc file - Ex: .bashrc
            export EDITOR="subl -w"
            ----- or ----
            export EDITOR="vim"

    2. $HOME/.config/slack-standup/.slackrc.json file - has to be valid JSON
        a) need to create

    3. Sublime Editor
        a) Must use the -w (--wait) option with the editor (see above #1)
        b) If you don't want to change your EDITOR env value you can add it
           to your .slackrc.json file as "editor": "subl -w"

    4. TMUX Sessions
        a) If you use tmux and sublime (or atom) you need to reattach the editor
           process to the user. Do this:

            brew install reattach-to-user-namespace


Setup:

Go here, scroll to the bottom and create OAuth token:
https://api.slack.com/web

    $ cd
    $ mkdir ~/.config/slack-standup
    $ vim ~/.config/slack-standup/slackrc.json
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
        a) When used daily, Today's lists are automatically appended to Yesterday's list

    4. Update Standup:
        a) Re-run, edit and save; it will update the post with the new data

    5. Delete Standup:
        a) You can do it via the application or
        b) Re-run, change 'live' to false and quit; it will remove the post
