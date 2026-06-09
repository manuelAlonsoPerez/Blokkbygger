const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";
const BG_GREEN = "\x1b[42m";
const BG_RED = "\x1b[41m";
const BG_MAGENTA = "\x1b[45m";
const BG_CYAN = "\x1b[46m";

const LINE = `${DIM}${"─".repeat(60)}${RESET}`;

export function suite(name: string) {
  console.log("");
  console.log(`${BOLD}${BG_MAGENTA}${WHITE} SUITE ${RESET} ${BOLD}${MAGENTA}${name}${RESET}`);
  console.log(LINE);
}

export function spec(name: string) {
  console.log("");
  console.log(`  ${BOLD}${BG_CYAN}${WHITE} TEST ${RESET}  ${BOLD}${CYAN}${name}${RESET}`);
}

export function step(message: string) {
  console.log(`  ${DIM}│${RESET}  ${YELLOW}→${RESET} ${message}`);
}

export function data(label: string, value: unknown) {
  console.log(`  ${DIM}│${RESET}  ${DIM}  ↳ ${label}:${RESET} ${BOLD}${WHITE}${value}${RESET}`);
}

export function pass(message: string) {
  console.log(`  ${DIM}│${RESET}`);
  console.log(`  ${DIM}└${RESET}  ${BG_GREEN}${BOLD}${WHITE} PASS ${RESET} ${GREEN}${message}${RESET}`);
}

export function fail(message: string) {
  console.log(`  ${DIM}│${RESET}`);
  console.log(`  ${DIM}└${RESET}  ${BG_RED}${BOLD}${WHITE} FAIL ${RESET} ${message}`);
}
