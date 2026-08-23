import { runDashboardUrlTests } from "./dashboardUrl.test";
import { runHierarchyScopingTests } from "./scopingHierarchy.test";
import { runScopeSwitcherTests } from "./scopeSwitcher.test";

function main() {
    console.log("=================================================");
    console.log(" UNIVERSAL HIERARCHY & ROUTING TEST SUITE RUNNER ");
    console.log("=================================================\n");

    const suites = [
        { name: "1. Dashboard URL & Hygiene Tests", run: runDashboardUrlTests },
        { name: "2. Hierarchy Scoping & Direct-Only Tests", run: runHierarchyScopingTests },
        { name: "3. Scope View Switcher Routing Tests", run: runScopeSwitcherTests },
    ];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const suite of suites) {
        console.log(`▶ Running Suite: ${suite.name}`);
        const results = suite.run();
        for (const res of results) {
            if (res.passed) {
                console.log(`  ✓ PASS: ${res.name}`);
                totalPassed++;
            } else {
                console.log(`  ✗ FAIL: ${res.name}`);
                console.log(`    Error: ${res.error}`);
                totalFailed++;
            }
        }
        console.log("");
    }

    console.log("-------------------------------------------------");
    console.log(`TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed (Total: ${totalPassed + totalFailed})`);
    console.log("-------------------------------------------------");

    if (totalFailed > 0) {
        process.exit(1);
    }
}

main();
