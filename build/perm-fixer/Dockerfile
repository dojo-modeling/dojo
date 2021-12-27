FROM --platform=linux/amd64 ubuntu:latest
RUN apt update && apt install -y inotify-tools
COPY watch.sh /
CMD ["/watch.sh"]
