JS := $(shell find lib/ -name "*.js")

.PHONY: install
install:
	@npm install $(REGISTRY)

simple-dyno.js:
	./node_modules/.bin/browserify -t babelify --no-bundle-external --standalone simple-dyno ./lib/index.js > ./simple-dyno.js

.PHONY: test
test: test-unit test-integration

.PHONY: test-unit
test-unit: node_modules
	./node_modules/.bin/mocha test/unit

.PHONY: test-integration
test-integration: node_modules
	./node_modules/.bin/mocha test/integration