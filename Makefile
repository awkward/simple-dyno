REGISTRY = "--registry=http://registry.npm.taobao.org"
JS := $(shell find lib/ -name "*.js")

.PHONY: install
install:
	@npm install $(REGISTRY)

simple-dyno.js:
	cat build/*.js > simple-dyno.js

build: $(JS) node_modules
	rm -rf build/
	./node_modules/.bin/babel lib \
		--modules common \
		--out-dir build \
		--stage 4

.PHONY: test
test: test-unit test-integration

.PHONY: test-unit
test-unit: node_modules
	./node_modules/.bin/mocha test/unit

.PHONY: test-integration
test-integration: node_modules
	./node_modules/.bin/mocha test/integration