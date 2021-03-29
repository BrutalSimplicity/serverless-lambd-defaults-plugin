
ci-setup-env:
	npm ci
	npm run build

ci-publish:
	./publish.sh
