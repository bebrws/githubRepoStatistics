# Github Repo Statistics

I wanted a VERY simple way to view Github statistics for all my public repos and couldn't find a tool to do this.
Especially nothing lightweight and without a bunch of dependencies I didn't want to install.

This command line tool: 
```grst```
will list all your public repos on the command line with all of the available traffic
statistics.

This includes number of clones, views, referrer information and paths.

At the very end a sorted list of repos by clone and view count is also listed.
Just to make it easy to figure out which repo from the first printout you might want to review.

In order to use this either set the environment variables
```GITHUB_USERNAME```
and
```GITHUB_TOKEN```
or just answer the prompts.

![An image of the output of grst](http://bradbarrows.com/static/reposSorted.png)