#!/bin/bash
chmod 0777 -R /data

inotifywait -m -r /data -e create -e moved_to |
    while read dir action file; do
        echo "The file '$file' appeared in directory '$dir' via '$action'"
        chmod 0777 -R $dir$file;
    done
