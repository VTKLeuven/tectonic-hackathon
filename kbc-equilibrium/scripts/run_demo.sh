#!/usr/bin/env bash
# ==============================================================================
# 🏛️ KBC EQUILIBRIUM: One-Click Demo Runner
# Tectonic Hackathon 2026 - Autonomous Bancassurance & SME Life-Hydraulics Engine
# ==============================================================================
# Usage:
#   ./scripts/run_demo.sh
#   or from project root: ./kbc-equilibrium/scripts/run_demo.sh
# ==============================================================================

set -e

# ANSI Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BLUE}${BOLD}"
echo "================================================================================"
echo "   🏛️  KBC EQUILIBRIUM: THE AUTONOMOUS BANCASSURANCE HYDRAULICS ENGINE"
echo "   Tectonic Hackathon 2026 | KBC Challenge A | Aikido 100% Zero-Trust Audit"
echo "================================================================================"
echo -e "${RESET}"

# Determine directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
VENV_DIR="${BACKEND_DIR}/.venv"

echo -e "${CYAN}📁 Project Root:${RESET} ${PROJECT_ROOT}"
echo -e "${CYAN}📁 Backend Dir: ${RESET} ${BACKEND_DIR}"
echo -e "${CYAN}📁 Frontend Dir:${RESET} ${FRONTEND_DIR}"
echo ""

# 1. Check Python / uv
echo -e "${BLUE}==> [1/5] Checking Python Environment...${RESET}"
if command -v uv >/dev/null 2>&1; then
    PKG_MGR="uv"
    echo -e "${GREEN}✓ Found uv: $(uv --version)${RESET}"
else
    PKG_MGR="pip"
    echo -e "${YELLOW}ℹ uv not found, falling back to python3 venv/pip${RESET}"
fi

# 2. Virtual Environment Setup
echo -e "${BLUE}==> [2/5] Initializing Virtual Environment...${RESET}"
if [ ! -d "${VENV_DIR}" ]; then
    echo -e "${YELLOW}Creating virtual environment at ${VENV_DIR}...${RESET}"
    if [ "${PKG_MGR}" = "uv" ]; then
        uv venv "${VENV_DIR}"
    else
        python3 -m venv "${VENV_DIR}"
    fi
else
    echo -e "${GREEN}✓ Virtual environment found: ${VENV_DIR}${RESET}"
fi

PYTHON_BIN="${VENV_DIR}/bin/python"
PYTEST_BIN="${VENV_DIR}/bin/pytest"
UVICORN_BIN="${VENV_DIR}/bin/uvicorn"

# 3. Dependencies Installation
echo -e "${BLUE}==> [3/5] Verifying Dependencies...${RESET}"
if [ "${PKG_MGR}" = "uv" ]; then
    uv pip install --python "${PYTHON_BIN}" -r "${BACKEND_DIR}/requirements.txt" pytest httpx websockets >/dev/null 2>&1
else
    "${PYTHON_BIN}" -m pip install -q -r "${BACKEND_DIR}/requirements.txt" pytest httpx websockets
fi
echo -e "${GREEN}✓ Dependencies up to date (FastAPI, Pydantic v2, Pytest, HTTPX, WebSockets)${RESET}"

# 4. Automated Test Suite Execution
echo -e "${BLUE}==> [4/5] Running Automated Test Suite & Security Invariant Checks...${RESET}"
export PYTHONPATH="${BACKEND_DIR}:${PROJECT_ROOT}"
"${PYTEST_BIN}" "${PROJECT_ROOT}/tests" -q --tb=short

echo -e "${GREEN}${BOLD}✓ 100% Test Suite Passed! Solvency bounds, Anti-IDOR, and Itsme® SCA verified.${RESET}"
echo ""

# 5. Launch Backend Server & Open Frontend
echo -e "${BLUE}==> [5/5] Launching KBC Equilibrium Backend & Kinetic Canvas...${RESET}"

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down KBC Equilibrium background processes...${RESET}"
    if [ -n "${UVICORN_PID}" ]; then
        kill "${UVICORN_PID}" 2>/dev/null || true
    fi
    echo -e "${GREEN}Cleanup complete. Goodbye!${RESET}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Uvicorn backend on port 8000
echo -e "${CYAN}Starting FastAPI backend on ${BOLD}http://localhost:8000${RESET}${CYAN}...${RESET}"
cd "${BACKEND_DIR}"
"${UVICORN_BIN}" main:app --host 0.0.0.0 --port 8000 --log-level warning &
UVICORN_PID=$!

# Wait for server readiness
echo -n "Waiting for API server to become ready"
for i in {1..20}; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo -e " ${GREEN}${BOLD}[READY]${RESET}"
        break
    fi
    echo -n "."
    sleep 0.5
done

echo ""
echo -e "${GREEN}${BOLD}================================================================================"
echo -e "   🚀 KBC EQUILIBRIUM IS LIVE!"
echo -e "   • Backend API:        ${CYAN}http://localhost:8000${RESET}"
echo -e "   • Interactive Docs:   ${CYAN}http://localhost:8000/docs${RESET}"
echo -e "   • Health Check:       ${CYAN}http://localhost:8000/api/health${RESET}"
echo -e "   • Kinetic Canvas UI:  ${CYAN}file://${FRONTEND_DIR}/index.html${RESET}"
echo -e "${GREEN}${BOLD}================================================================================${RESET}"
echo ""

# Open Frontend in default browser
FRONTEND_FILE="${FRONTEND_DIR}/index.html"
if command -v open >/dev/null 2>&1; then
    # macOS
    open "${FRONTEND_FILE}"
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "${FRONTEND_FILE}"
else
    echo -e "${YELLOW}Please open ${FRONTEND_FILE} in your web browser.${RESET}"
fi

echo -e "${CYAN}Server running with PID ${UVICORN_PID}. Press ${BOLD}Ctrl+C${RESET}${CYAN} to stop.${RESET}"
echo ""

# Keep alive to stream logs or wait for Ctrl+C
wait "${UVICORN_PID}"
