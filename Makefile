.PHONY: build push

build:
	docker build . --platform linux/amd64 -t sayhiben/minicpm-o-2.6-events-parser:latest

push:
	docker push sayhiben/minicpm-o-2.6-events-parser:latest