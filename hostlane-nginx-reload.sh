#!/bin/bash
set -e

rsync -a --delete /var/lib/hostlane/config/ /etc/nginx/hostlane/
nginx -t
systemctl reload nginx
