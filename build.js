import { execSync } from 'child_process';

const isProduction = process.argv.includes('--prod');

// 直接在Node.js进程中设置环境变量，避免shell兼容性问题
if (isProduction) {
  process.env.NODE_ENV = 'production';
} else {
  process.env.NODE_ENV = 'development';
}

try {
  execSync('rollup -c --bundleConfigAsCjs', {
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
