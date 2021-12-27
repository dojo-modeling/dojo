#!/bin/bash

set -e

logi() {
  echo "[$(date '+%Y-%m-%d %H:%H:%S')] ${@}"
}

main() {
  logi "Starting socket server"
  nohup /home/terminal/.tools/connector --settings /home/terminal/.tools/default-settings.yaml >/var/log/connector/connector.log 2>&1 &
  logi "String ssh"
  sudo /usr/sbin/sshd -D
  logi "Running..."
}

control_c() {
  echo ""
  exit
}

trap control_c SIGINT SIGTERM SIGHUP

main

exit
