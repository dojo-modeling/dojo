FROM nginx
RUN mkdir -p /etc/nginx/templates
COPY conf/default.conf /etc/nginx/templates/default.conf.template
COPY dist /usr/share/nginx/html
