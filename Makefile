# Cluster Guardian UI
#
# `make help` lists every target. Most work needs a backend to talk to:
# `make backend` builds one from a cluster-guardian checkout, `make serve-fixture`
# runs it with canned reports and no cluster.

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Where the cluster-guardian checkout lives, and where its binary ends up.
BACKEND_REPO ?= ../cluster-guardian
CG_BIN       ?= $(BACKEND_REPO)/cluster-guardian
# Backend address the dev server, preview and e2e all proxy to.
CG_URL       ?= http://127.0.0.1:8099
CG_PORT      ?= 8099

IMAGE ?= ghcr.io/cluster-guardian/cluster-guardian-ui
TAG   ?= dev

FIXTURES := e2e/fixtures/run1.json e2e/fixtures/run2.json
FIXTURE_FLAGS := $(foreach f,$(FIXTURES),--fixture $(f))

# Any npm target depends on the install having happened. node_modules is the
# stamp; package-lock.json changing re-runs it.
NODE_MODULES := node_modules/.package-lock.json

##@ Setup

.PHONY: install
install: $(NODE_MODULES) ## Install dependencies (npm ci)

$(NODE_MODULES): package-lock.json package.json
	npm ci
	@touch $@

.PHONY: backend
backend: ## Build the cluster-guardian binary from $(BACKEND_REPO)
	@test -d "$(BACKEND_REPO)" || { \
		echo "No checkout at $(BACKEND_REPO)."; \
		echo "Clone it, or point BACKEND_REPO at yours:"; \
		echo "  git clone https://github.com/cluster-guardian/cluster-guardian $(BACKEND_REPO)"; \
		echo "  make backend BACKEND_REPO=/path/to/cluster-guardian"; \
		exit 1; }
	cd "$(BACKEND_REPO)" && go build -o cluster-guardian .
	@echo "built $(CG_BIN)"

##@ Develop

.PHONY: dev
dev: install ## Run the dev server against CG_URL (default $(CG_URL))
	CG_URL=$(CG_URL) npm run dev

.PHONY: serve-fixture
serve-fixture: ## Run a backend on canned reports — no cluster needed
	@test -x "$(CG_BIN)" || { echo "No binary at $(CG_BIN). Run: make backend"; exit 1; }
	$(CG_BIN) serve $(FIXTURE_FLAGS) --listen 127.0.0.1:$(CG_PORT)

.PHONY: preview
preview: build ## Serve the production bundle locally
	CG_URL=$(CG_URL) npm run preview

##@ Verify

.PHONY: check
check: lint format typecheck test ## Everything CI runs except e2e

.PHONY: lint
lint: install ## eslint
	npm run lint

.PHONY: format
format: install ## Check formatting (prettier --check)
	npm run format

.PHONY: format-fix
format-fix: install ## Rewrite files to the prettier style
	npm run format:write

.PHONY: typecheck
typecheck: install ## tsc
	npm run typecheck

.PHONY: test
test: install ## Unit tests (vitest)
	npm test

.PHONY: e2e
e2e: install build ## Playwright against a real serve --fixture
	@test -x "$(CG_BIN)" || { echo "No binary at $(CG_BIN). Run: make backend"; exit 1; }
	CG_BIN=$(CG_BIN) CG_PORT=$(CG_PORT) npx playwright test

.PHONY: e2e-ui
e2e-ui: install build ## Playwright in interactive mode
	@test -x "$(CG_BIN)" || { echo "No binary at $(CG_BIN). Run: make backend"; exit 1; }
	CG_BIN=$(CG_BIN) CG_PORT=$(CG_PORT) npx playwright test --ui

.PHONY: audit
audit: install ## Fail on a high-severity advisory
	npm audit --audit-level=high

##@ Build

.PHONY: build
build: install ## Production bundle into dist/
	npm run build

.PHONY: design
design: install ## Regenerate the Claude Design bundle from src/
	npm run design:build

.PHONY: image
image: ## Build the container image
	docker build -t $(IMAGE):$(TAG) .

.PHONY: image-run
image-run: image ## Run the image against CG_URL on :8080
	docker run --rm -p 8080:8080 \
		-e CG_UPSTREAM=$(subst 127.0.0.1,host.docker.internal,$(CG_URL)) \
		$(IMAGE):$(TAG)

##@ Housekeeping

.PHONY: clean
clean: ## Remove build output and test artifacts
	rm -rf dist design/dist coverage playwright-report test-results

.PHONY: clean-all
clean-all: clean ## Also remove node_modules
	rm -rf node_modules

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)
	@echo ""
