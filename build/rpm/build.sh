#!/bin/bash

set -e

HERE=$(cd "${0%/*}" 2>/dev/null; echo "$PWD")
cd $HERE

NAME=diligence-1.0beta1-0.noarch
OUTPUT=BUILDROOT/$NAME

# Content
rm -rf $OUTPUT
mkdir -p $OUTPUT/usr/lib/diligence/
mkdir -p $OUTPUT/usr/share/applications/
cp -r ../distribution/content/* $OUTPUT/usr/lib/diligence/
cp ../../components/media/diligence.png $OUTPUT/usr/lib/diligence/
cp diligence.desktop $OUTPUT/usr/share/applications/

rpmbuild --define "_topdir $HERE" --target noarch -bb --sign SPECS/diligence.spec

# Cleanup
rm -rf $OUTPUT
mv RPMS/noarch/$NAME.rpm ../distribution/diligence-1.0-beta1.rpm

echo Done!
