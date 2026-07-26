export function createReporter({ json = false } = {}) {
  const results = [];

  function log(line) {
    if (!json) console.log(line);
  }

  function record(entry) {
    results.push(entry);
    const icon = entry.status === 'pass' ? '✓' : entry.status === 'skip' ? '○' : '✗';
    log(`${icon} [${entry.suite}] ${entry.name}: ${entry.status}${entry.detail ? ` — ${entry.detail}` : ''}`);
  }

  return {
    pass(suite, name, detail = '') {
      record({ suite, name, status: 'pass', detail });
    },
    fail(suite, name, detail = '') {
      record({ suite, name, status: 'fail', detail });
    },
    skip(suite, name, detail = '') {
      record({ suite, name, status: 'skip', detail });
    },
    results() {
      return results;
    },
    summary() {
      const pass = results.filter((r) => r.status === 'pass').length;
      const fail = results.filter((r) => r.status === 'fail').length;
      const skip = results.filter((r) => r.status === 'skip').length;
      return { pass, fail, skip, total: results.length };
    },
    printSummary() {
      const s = this.summary();
      log(`\nSmoke summary: ${s.pass} pass, ${s.fail} fail, ${s.skip} skip (${s.total} checks)`);
      if (json) {
        console.log(JSON.stringify({ summary: s, results }, null, 2));
      }
    },
  };
}
