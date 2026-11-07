#!/usr/bin/env bash
# Enforces the layering rules in .agent/rules/backend-architecture.md,
# .agent/rules/frontend-architecture.md and .agent/rules/configuration.md.
# Usage: check-layers.sh [repo-root]   (defaults to this repository)
set -euo pipefail

ROOT_DIR="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

API_SRC="apps/api/src"
CONSOLE_SRC="apps/console/src"
failed=0

fail() {
    printf '[layers] %s\n' "$1"
    failed=1
}

# List .ts/.tsx files under a directory (nothing if it does not exist).
ts_files() {
    [[ -d "$1" ]] || return 0
    find "$1" -type f \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.d.ts' | sort
}

# Print "file:line:text" for lines matching an extended regex, one directory at a time.
search() {
    local pattern="$1"
    shift
    local dir
    for dir in "$@"; do
        [[ -e "$dir" ]] || continue
        grep -rnE --include='*.ts' --include='*.tsx' "$pattern" "$dir" || true
    done
}

# Collapse "a/b/../c/./d" into "a/c/d" without touching the filesystem.
normalize_path() {
    local IFS=/ part
    local -a parts=() out=()
    read -ra parts <<<"$1"
    for part in "${parts[@]}"; do
        case "$part" in
        "" | .) ;;
        ..) ((${#out[@]})) && unset 'out[${#out[@]}-1]' ;;
        *) out+=("$part") ;;
        esac
    done
    printf '%s' "${out[*]}"
}

# Rule: a module/feature imports another one only through its public index.
#   $1 = base dir (apps/api/src/modules), $2 = alias (@/modules), $3 = src root, $4 = label
check_isolation() {
    local base="$1" alias="$2" src="$3" label="$4"
    [[ -d "$base" ]] || return 0
    local file line spec owner target rel resolved
    while IFS= read -r file; do
        owner=""
        if [[ "$file" == "$base"/* ]]; then
            rel="${file#"$base"/}"
            owner="${rel%%/*}"
        fi
        while IFS= read -r line; do
            spec="${line#*from \"}"
            spec="${spec%%\"*}"
            target=""
            if [[ "$spec" == "$alias"/*/* ]]; then
                rel="${spec#"$alias"/}"
                target="${rel%%/*}"
            elif [[ "$spec" == .* ]]; then
                resolved="$(normalize_path "$(dirname "$file")/$spec")"
                if [[ "$resolved" == "$base"/*/* ]]; then
                    rel="${resolved#"$base"/}"
                    target="${rel%%/*}"
                fi
            fi
            if [[ -n "$target" && "$target" != "$owner" ]]; then
                fail "$file imports $label internals ($spec); import \"$alias/$target\" instead"
            fi
        done < <(grep -E 'from "[^"]+"' "$file" || true)
    done < <(ts_files "$src")
}

# Files whose role is a given layer: "<name>.<role>.ts" or inside a "<role>s/" folder.
role_files() {
    local src="$1" role="$2"
    ts_files "$src" | grep -E "(\.${role}\.tsx?$|/${role}s/)" || true
}

echo "Running layering checks..."

# --- configuration: env is read only in config/ -------------------------------------------
while IFS= read -r hit; do
    fail "$hit -> read env only in $API_SRC/config/ (configuration rule)"
done < <(search 'process\.env|Bun\.env|import\.meta\.env' "$API_SRC" | grep -v "^$API_SRC/config/" || true)

while IFS= read -r hit; do
    fail "$hit -> read env only in $CONSOLE_SRC/config/ (configuration rule)"
done < <(search 'process\.env|import\.meta\.env' "$CONSOLE_SRC" | grep -v "^$CONSOLE_SRC/config/" || true)

while IFS= read -r hit; do
    fail "$hit -> packages read env only through @synapse/core/config"
done < <(search 'process\.env|Bun\.env' packages | grep -v '^packages/core/src/config/' | grep -E '^packages/[^/]+/src/' || true)

# --- backend ---------------------------------------------------------------------------
check_isolation "$API_SRC/modules" "@/modules" "$API_SRC" "module"

while IFS= read -r file; do
    if grep -nE 'from "(hono|@hono/[^"]+)(/[^"]*)?"' "$file" >/dev/null; then
        fail "$file: services and repositories must not import Hono (no HTTP in business logic)"
    fi
    if grep -nE 'from "[^"]*(common/api-response|shared/responses)[^"]*"' "$file" >/dev/null; then
        fail "$file: services and repositories must not build HTTP responses"
    fi
done < <(
    role_files "$API_SRC" service
    role_files "$API_SRC" repository
)

while IFS= read -r file; do
    if grep -nE 'from "[^"]*(\.repository|/repositories/)[^"]*"' "$file" >/dev/null; then
        fail "$file: routes and controllers call services, never repositories"
    fi
done < <(
    role_files "$API_SRC" route
    role_files "$API_SRC" controller
)

while IFS= read -r hit; do
    fail "$hit -> build responses with the shared response helpers"
done < <(search '\bc\.(json|body|text|html)\(|new Response\(' "$API_SRC" |
    grep -vE "^$API_SRC/(common|shared/responses|shared/errors)/" || true)

while IFS= read -r hit; do
    fail "$hit -> database drivers only in repositories and database infrastructure"
done < <(search 'from "(drizzle-orm|postgres)(/[^"]*)?"' "$API_SRC" |
    grep -vE "^$API_SRC/(database|infrastructure/database)/|\.repository\.ts:|/repositories/" || true)

# --- frontend --------------------------------------------------------------------------
check_isolation "$CONSOLE_SRC/features" "@/features" "$CONSOLE_SRC" "feature"

while IFS= read -r hit; do
    fail "$hit -> call the API only through $CONSOLE_SRC/lib/api/"
done < <(search '\bfetch\(' "$CONSOLE_SRC" | grep -v "^$CONSOLE_SRC/lib/api/" || true)

while IFS= read -r hit; do
    fail "$hit -> feature services are plain functions (no React, TanStack Query or Next)"
done < <(search 'from "(react|react-dom|next|@tanstack/react-query)(/[^"]*)?"' "$CONSOLE_SRC/features" |
    grep -E "^$CONSOLE_SRC/features/[^/]+/services/" || true)

while IFS= read -r hit; do
    fail "$hit -> presentation components get data via props; containers own hooks and services"
done < <(search 'from "[^"]*(/hooks/|/services/|@tanstack/react-query|@/lib/api)[^"]*"' "$CONSOLE_SRC/features" |
    grep -E "^$CONSOLE_SRC/features/[^/]+/components/" || true)

while IFS= read -r file; do
    name="$(basename "$file")"
    case "$file" in
    */hooks/queries/*) [[ "$name" =~ ^use-[a-z0-9-]+-query\.tsx?$ ]] || fail "$file: query hooks are named use-<thing>-query.ts" ;;
    */hooks/mutations/*) [[ "$name" =~ ^use-[a-z0-9-]+-mutation\.tsx?$ ]] || fail "$file: mutation hooks are named use-<action>-<thing>-mutation.ts" ;;
    esac
done < <(ts_files "$CONSOLE_SRC/features")

if [[ "$failed" -ne 0 ]]; then
    echo "Layering checks failed. Rules: .agent/rules/backend-architecture.md, frontend-architecture.md, configuration.md"
    exit 1
fi
echo "Layering checks passed."
