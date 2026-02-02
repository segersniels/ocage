BINARY_NAME=ocage
INSTALL_PATH=~/.local/bin
VERSION ?= $(shell date +%Y%m%d%H%M%S)

PLATFORMS = darwin-arm64 linux-arm64 linux-x64
RELEASE_BINARIES = $(addprefix $(BINARY_NAME)-,$(PLATFORMS))

DOCKER_USER ?= segersniels
DOCKER_IMAGE=$(DOCKER_USER)/ocage:latest

.PHONY: build build-release install uninstall clean publish css create-github-release create-docker-release docker-run

# Build CSS with Tailwind CLI (required for --compile, plugin only works at runtime)
css:
	bunx @tailwindcss/cli -i src/styles.css -o src/styles.built.css

build: css
	bun build src/server/index.ts --compile --outfile $(BINARY_NAME)

$(BINARY_NAME)-%: src/server/index.ts css
	bun build $< --compile --target=bun-$* --outfile $@

build-release: $(RELEASE_BINARIES)

install: build
	mv $(BINARY_NAME) $(INSTALL_PATH)/$(BINARY_NAME)

uninstall:
	rm -f $(INSTALL_PATH)/$(BINARY_NAME)

clean:
	rm -f $(BINARY_NAME) $(RELEASE_BINARIES)

create-github-release: build-release
	$(eval PREV_SHA := $(shell gh release view latest --json targetCommitish -q '.targetCommitish' 2>/dev/null))
	-gh release delete latest --yes 2>/dev/null
	gh release create latest --target "$$(git rev-parse HEAD)" --title "Latest" \
		--notes "$$(if [ -n '$(PREV_SHA)' ]; then git log $(PREV_SHA)..HEAD --oneline; else echo 'Initial release'; fi)" \
		$(RELEASE_BINARIES)
	rm -f $(RELEASE_BINARIES)

create-docker-release:
	docker buildx create --name ocage-builder --use 2>/dev/null || docker buildx use ocage-builder
	docker buildx build --platform linux/amd64,linux/arm64 -t $(DOCKER_IMAGE) --push .

docker-run:
	docker build -t $(DOCKER_IMAGE) . && \
	docker run -p 3333:3333 \
		-v ~/.local/share/opencode:/home/ocage/.local/share/opencode:ro \
		-v ~/.codex:/home/ocage/.codex:ro \
		-v ~/.claude:/home/ocage/.claude:ro \
		-v ~/.config/ocage:/home/ocage/.config/ocage \
		$(DOCKER_IMAGE)

publish: create-github-release create-docker-release
