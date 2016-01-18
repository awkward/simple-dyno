.PHONY: install
install:
	@npm install

simple-dyno.js:
	./node_modules/.bin/browserify -t babelify --no-bundle-external --standalone simple-dyno ./lib/index.js > ./simple-dyno.js

.PHONY: test
test: test-unit

.PHONY: test-unit
test-unit: node_modules
	./node_modules/.bin/mocha test/unit
