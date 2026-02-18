/**
 * Minimal readline-based interactive prompts.
 * No dependencies — uses Node's built-in readline.
 */

const readline = require("readline");

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stderr, // prompts go to stderr, stdout reserved for data
  });
}

/**
 * Ask a yes/no confirmation question.
 * @param {string} message - The question to ask
 * @param {boolean} defaultYes - Default answer if user just presses enter
 * @returns {Promise<boolean>}
 */
async function confirm(message, defaultYes = true) {
  const rl = createInterface();
  const suffix = defaultYes ? "[Y/n]" : "[y/N]";

  return new Promise((resolve) => {
    rl.question(`${message} ${suffix} `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") resolve(defaultYes);
      else resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}

/**
 * Present a multi-select list. User toggles items with numbers, confirms with enter.
 * @param {string} message - The prompt message
 * @param {Array<{name: string, checked: boolean}>} choices - Items to select from
 * @returns {Promise<string[]>} - Selected item names
 */
async function multiSelect(message, choices) {
  const rl = createInterface();
  const selected = new Set(choices.filter((c) => c.checked).map((c) => c.name));

  function render() {
    process.stderr.write(`\n${message}\n`);
    choices.forEach((c, i) => {
      const check = selected.has(c.name) ? "[x]" : "[ ]";
      process.stderr.write(`  ${i + 1}. ${check} ${c.name}\n`);
    });
    process.stderr.write(
      "\nToggle with numbers (e.g. 1,3), press Enter to confirm: ",
    );
  }

  return new Promise((resolve) => {
    render();

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed === "") {
        rl.close();
        resolve([...selected]);
        return;
      }

      // Parse comma-separated numbers
      const nums = trimmed.split(/[,\s]+/).map(Number);
      for (const n of nums) {
        if (n >= 1 && n <= choices.length) {
          const name = choices[n - 1].name;
          if (selected.has(name)) selected.delete(name);
          else selected.add(name);
        }
      }
      render();
    });
  });
}

module.exports = { confirm, multiSelect };
