#!/usr/bin/env bash
# Proves scripts/architecture/check-layers.sh catches each rule on a throwaway fixture repo.
set -euo pipefail

CHECK="$(cd "$(dirname "$0")/../../architecture" && pwd)/check-layers.sh"
fixture="$(mktemp -d)"
trap 'rm -rf "$fixture"' EXIT

put() {
    mkdir -p "$(dirname "$fixture/$1")"
    printf '%s\n' "$2" >"$fixture/$1"
}

# --- a clean layout passes ---------------------------------------------------------------
put apps/api/src/config/env.ts 'export const port = process.env.PORT;'
put apps/api/src/modules/rag/index.ts 'export { RagService } from "./services/rag.service";'
put apps/api/src/modules/rag/services/rag.service.ts 'import { SynapseError } from "@synapse/core";'
put apps/api/src/modules/rag/repositories/rag.repository.ts 'import { eq } from "drizzle-orm";'
put apps/api/src/modules/rag/routes/rag.routes.ts 'import { RagService } from "../services/rag.service";'
put apps/api/src/modules/chat/chat.routes.ts 'import { RagService } from "@/modules/rag";'
put apps/api/src/modules/chat/chat.tools.ts 'import { RagService } from "../rag";'
put apps/api/src/shared/responses/success-response.ts 'export const ok = (c) => c.json({});'
put apps/console/src/lib/api/client.ts 'export const api = () => fetch("/x");'
put apps/console/src/config/env.ts 'export const url = process.env.NEXT_PUBLIC_API_URL;'
put apps/console/src/features/users/services/user.service.ts 'import { api } from "@/lib/api/client";'
put apps/console/src/features/users/hooks/queries/use-users-query.ts 'import { useQuery } from "@tanstack/react-query";'
put apps/console/src/features/users/hooks/mutations/use-create-user-mutation.ts 'import { useMutation } from "@tanstack/react-query";'
put apps/console/src/features/users/components/user-table.tsx 'import type { User } from "../types/user.types";'
put apps/console/src/features/users/containers/users-container.tsx 'import { useUsersQuery } from "../hooks/queries/use-users-query";'
put apps/console/src/features/agents/containers/agents-container.tsx 'import { UserTable } from "@/features/users";'

if ! out="$(bash "$CHECK" "$fixture" 2>&1)"; then
    echo "clean fixture should pass, got:"
    echo "$out"
    exit 1
fi

# --- each violation is reported ----------------------------------------------------------
put apps/api/src/database/migrate.ts 'const url = process.env.DATABASE_URL;'
put apps/api/src/modules/chat/chat.service.ts 'import { RagRepository } from "@/modules/rag/repositories/rag.repository";'
put apps/api/src/modules/chat/chat.helper.ts 'import { x } from "../rag/services/rag.service";'
put apps/api/src/modules/rag/services/rag-http.service.ts 'import type { Context } from "hono";'
put apps/api/src/modules/rag/routes/rag-admin.routes.ts 'import { r } from "../repositories/rag.repository";'
put apps/api/src/modules/rag/routes/rag-raw.routes.ts 'export const h = (c) => c.json({ error: "x" }, 400);'
put apps/api/src/modules/rag/services/rag-db.service.ts 'import { eq } from "drizzle-orm";'
put packages/demo/src/index.ts 'export const k = process.env.KEY;'
put apps/console/src/features/users/components/user-list.tsx 'import { useUsersQuery } from "../hooks/queries/use-users-query";'
put apps/console/src/features/users/services/user-cache.service.ts 'import { useQuery } from "@tanstack/react-query";'
put apps/console/src/features/agents/containers/agent-users.tsx 'import { userService } from "@/features/users/services/user.service";'
put apps/console/src/features/users/hooks/queries/users.ts 'export const x = 1;'
put apps/console/src/features/users/hooks/mutations/create-user.ts 'export const x = 1;'
put apps/console/src/app/page.tsx 'const r = fetch("/api");'
put apps/console/src/app/env.ts 'const k = process.env.SECRET;'

if out="$(bash "$CHECK" "$fixture" 2>&1)"; then
    echo "violating fixture should fail"
    exit 1
fi

expect() {
    if ! grep -qF -- "$1" <<<"$out"; then
        echo "missing report: $1"
        echo "--- output ---"
        echo "$out"
        exit 1
    fi
}

expect "apps/api/src/database/migrate.ts:1:"
expect "chat.service.ts imports module internals"
expect "chat.helper.ts imports module internals"
expect "rag-http.service.ts: services and repositories must not import Hono"
expect "rag-admin.routes.ts: routes and controllers call services, never repositories"
expect "rag-raw.routes.ts:1:"
expect "rag-db.service.ts:1:"
expect "packages/demo/src/index.ts:1:"
expect "user-list.tsx:1:"
expect "user-cache.service.ts:1:"
expect "agent-users.tsx imports feature internals"
expect "hooks/queries/users.ts: query hooks are named"
expect "hooks/mutations/create-user.ts: mutation hooks are named"
expect "apps/console/src/app/page.tsx:1:"
expect "apps/console/src/app/env.ts:1:"

echo "check-layers test passed"
