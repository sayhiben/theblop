/* src/tasks/buildTailwind.js */
import { execSync } from 'child_process';

export function buildTailwind() {
  // Adjust to match your Tailwind CLI usage
  execSync('npx tailwindcss -i ./assets/css/input.css -o ./dist/styles.css --minify', {
    stdio: 'inherit'
  });
}
