# ─────────────────────────────────────────────────────────────────────────────
# LeClaw — Agent Runner Image
#
# Published as: leclaw/runner:<version>
#
# Build:  npm run docker:build
# Push:   npm run docker:push
# Run:    docker run --rm -e HUBSPOT_TOKEN=... leclaw/runner:0.3.4 le-data-quality
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine

# Non-root user for security
RUN addgroup -S leclaw && adduser -S leclaw -G leclaw

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled JS source (TypeScript already compiled — run `npm run build` first)
COPY core/ ./core/
COPY agents/ ./agents/

# Remove test files from the image
RUN find . -name "*.test.js" -delete 2>/dev/null || true

USER leclaw

# Agent name is passed as the first argument
ENTRYPOINT ["node", "core/agent-runner.js"]
