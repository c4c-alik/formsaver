import { execSync } from 'child_process';

const isWindows = process.platform === 'win32';
const isProduction = process.argv.includes('--prod');

const envVar = isProduction ? 'NODE_ENV=production' : 'NODE_ENV=development';
const command = 'rollup -c --bundleConfigAsCjs';

if (isWindows) {
  // Windows 下使用 PowerShell 设置环境变量
  execSync(`$env:${envVar.split('=')[0]}="${envVar.split('=')[1]}"; ${command}`, {
    stdio: 'inherit',
    shell: 'powershell.exe',
  });
} else {
  execSync(`${envVar} ${command}`, { stdio: 'inherit' });
}
