#!/bin/bash

set -e

HERE=$(cd "${0%/*}" 2>/dev/null; echo "$PWD")
cd $HERE

dput sincerity diligence-1.0beta1-1_source.changes
