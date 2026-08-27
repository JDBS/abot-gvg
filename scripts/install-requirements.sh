#!/bin/bash

# install npm, nodejs and ffmpeg on Ubuntu (without root)

apt update

apt install -y npm

apt install -y nodejs

apt install -y ffmpeg

npm install -g bun
