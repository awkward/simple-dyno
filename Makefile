REGISTRY = "--registry=http://registry.npm.taobao.org"
JS := $(shell find lib/ -name "*.js")

.PHONY: install
install:
	@npm install $(REGISTRY)

simple-dyno.min.js simple-dyno.js.map: simple-dyno.js node_modules
	./node_modules/.bin/uglifyjs simple-dyno.js \
		--lint \
		--screw-ie8 \
		--output ./simple-dyno.min.js \
		--source-map ./simple-dyno.js.map

simple-dyno.js: build node_modules
	rm -rf simple-dyno.js /tmp/simple-dyno.js
	./node_modules/.bin/browserify --standalone simple-dyno ./build/index.js > simple-dyno.js

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