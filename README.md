
Diligence
=========

Diligence is a collection of ready-to-use code to help you tackle much of the dreary work
required for building massively multi-user web applications. It relies on and fully
embraces Prudence and MongoDB, two platforms designed from the ground-up for REST-friendly
scalability. With Diligence you can quickly get users logging in, accessing data based on
permissions, subscribing to email notifications, shopping and paying you, interacting with
each other, and managing their own content on your site. It lets you cleanly integrate with
third party technologies and services, from Ext JS and Sencha Touch to Facebook. 

Please see the [Diligence web site](http://threecrickets.com/diligence/) for comprehensive
documentation.

[![Download](http://threecrickets.com/media/download.png "Download")](http://threecrickets.com/diligence/download/)


Building Diligence
------------------

To build Diligence you need [Ant](http://ant.apache.org/),
[Maven](http://maven.apache.org/) and [Sincerity](http://threecrickets.com/sincerity/).

You may need to create a file named "/build/private.properties" (see below) and override
the default locations for Maven and Sincerity.

Then, simply change to the "/build/" directory and run "ant".

During the build process, build and distribution dependencies will be downloaded from
an online repository at http://repository.threecrickets.com/, so you will need Internet
access.

The result of the build will go into the "/build/distribution/" directory. Temporary
files used during the build process will go into "/build/cache/", which you are free to
delete.


Configuring the Build
---------------------

The "/build/custom.properties" file contains configurable settings, along with some
commentary on what they are used for. You are free to edit that file, however to avoid
git conflicts, it would be better to create your own "/build/private.properties"
instead, in which you can override any of the settings. That file will be ignored by
git.


Building the Diligence Manual
-----------------------------

To build the manual, as part of the standard build process, you will need to install
[LyX](http://www.lyx.org/) and [eLyXer](http://elyxer.nongnu.org/), and configure their
paths in "private.properties".


Packaging
---------

You can create distribution packages (zip, deb, rpm, IzPack) using the appropriate
"package-" Ant targets. They will go into the "/build/distribution/" directory.

If you wish to sign the deb and rpm packages, you need to install the "dpkg-sig" and
"rpm" tools, and configure their paths and your keys in "private.properties". 

In order to build the platform installers (for Windows and OS X), you will need
to install [InstallBuilder] (http://installbuilder.bitrock.com/) and configure
its path in "private.properties".

BitRock has generously provided the Diligence project with a free license, available
under "/build/installbuilder/license.xml". It will automatically be used by the build
process.


Still Having Trouble?
---------------------

Join the [Prudence Community]
(http://groups.google.com/group/prudence-community), and tell us where you're
stuck! We're very happy to help newcomers get up and running.