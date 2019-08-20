Slack Standup
==============

Slack standup is a script to make a daily status report easy using slack. When
the whole team uses this, it gives a nice overview of what everyone is working
on without taking time to actually do it in person which many find disruptive.

Version 2.0.0
-------------

__NOTE__: slack-standup follows [XDG directory
specification](http://standards.freedesktop.org/basedir-spec/basedir-spec-latest.html)


Installation
------------

1. `npm install slack-standup -g`

1. Go to https://api.slack.com/custom-integrations/legacy-tokens to create your slack token for use. (_NOTE_: patch is welcome for the new oauth)

1. create
`$HOME/.config/slack-standup/slackrc.yaml` or
`$HOME/.config/slack-standup/slackrc.json` depending on your preference.

    * properties:
        - `slack_token` - slack token from above
        - `channel` - channel you wish the post to go to
        - `user` - slack user to post as (default: env USER)
        - `editor` - editor to use to post (default: env EDITOR)

    example `slackrc.yaml`:
    ``` yaml
    slack_token: xoxp-9152601...
    channel: "#blah"
    user: daniel
    editor: nvim # or code -w ... etc
    ```

1. Sublime / VS Code Editor
    * Note you must use the -w (--wait) option with the editor.

2. TMUX Sessions
   * If you use tmux and sublime (or atom) you need to reattach the editor, you may have to install reattach-to-user-namespace. On newer versions of tmux, this shouldn't be necessary.

Tips and tricks
---------------

1. Automatic Conversions:
    * Stars (*) at the start of lines are converted to bullets
    * Hash (#) at the start of the lines are converted to numbered lists
    * Dash (-) at the start of lines are converted to endash

1. Comments in standup JSON file:
    * // commented lines are ignored and not ported to the next day
    * "// commented strings" are ignored for POST'ing but saved in the JSON

1. Today to Yesterday:
    * When used daily, Today's lists are automatically appended to Yesterday's list. It will check posts for 7 days

1. Update Standup:
    * Re-run, edit and save; it will update the post with the new data

1. Delete Standup:
    * You can do it via the application or
    * Re-run, change 'live' to false and quit; it will remove the post

Original Author
------
* https://github.com/caseman72
