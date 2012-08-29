#!/bin/bash

set -e

HERE=$(cd "${0%/*}" 2>/dev/null; echo "$PWD")
cd $HERE/debian

# Content
rm -rf content
cp -r ../../distribution/content .
cp ../diligence.desktop content/
cp ../../../components/media/diligence.png content/

# .dsc
cp debian/control-any debian/control
dpkg-buildpackage -S -kC11D6BA2

# .deb
cp debian/control-all debian/control
dpkg-buildpackage -b -kC11D6BA2

# Cleanup
rm -rf content
cd ..
mv diligence_1.0beta1-1_all.deb ../distribution/diligence-1.0-beta1.deb

echo Done!
