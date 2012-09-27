
Build requirements
==================

Ant              http://ant.apache.org/
Maven            http://maven.apache.org/
Sincerity        http://threecrickets.com/sincerity/


Optional requirements for building the documentation
====================================================

LyX              http://www.lyx.org/
eLyXer           http://elyxer.nongnu.org/


Optional requirements for packaging and distribution
====================================================

InstallBuilder   http://installbuilder.bitrock.com/


Configuration
=============

You can override any value in "build/custom.properties" by creating a file
named "build/private.properties" and setting any values there.

In particular, you want to make sure to set the "maven" and "sincerity"
properties to point to those tools.

Set the "lyx" and "elyxer" properties if you have those tools and want to
build the manual.

Set the "installbuilder" property if you have that tools and want to build
that package.


Build it!
=========

Running "ant" in the "build" directory should do the trick.

Note:

1) Ivy is used to download the build dependencies, so you do need an
Internet connection. By default, the dependencies are downloaded from the
Three Crickets Repository, but you can set a different URL, for example if
you are using a local proxy.

2) Maven is not used to build the project, but instead used only to deploy
the resulting packages to a Maven-type repository. By default, they are
deployed to the "build/cache/repository" directory, but you can set this to
a different URL.

3) Finally, Sincerity is used to assemble the distribution into the
"build/distribution/content" directory, from where it is ready to run.

Optionally, you can run "ant package" to package the distribution. Packages
will be put in the "build/distribution" directory.
