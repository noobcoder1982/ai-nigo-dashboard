const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

// Premium CLI Libraries
let chalk, ora, boxen, Table, open;
try {
    chalk = require('chalk');
    ora = require('ora');
    boxen = require('boxen');
    Table = require('cli-table3');
    open = require('open');
} catch (e) {
    console.log("Missing dependencies. Please run 'npm run install:deps' first.");
    process.exit(1);
}

// Configuration
const CONFIG = {
    FRONTEND_PORT: 3000,
    BACKEND_PORT: 8000,
    FRONTEND_DIR: path.join(__dirname, 'frontend'),
    PYTHON_EXE: path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
    BACKEND_CMD: ' -m uvicorn src.api.server:app --port 8000',
    BROWSER_URL: 'http://localhost:3000'
};

let frontendProcess = null;
let backendProcess = null;
let startTime = Date.now();
let browserOpened = false;
let isShuttingDown = false;

// --- UI HELPERS ---

const CLEAR_SCREEN = '\x1Bc';

function getNeoFetch() {
    const logo = `
${chalk.cyan('██████╗ ██╗   ██╗███╗   ███╗')}
${chalk.cyan('██╔══██╗██║   ██║████╗ ████║')}
${chalk.cyan('██████╔╝██║   ██║██╔████╔██║')}
${chalk.cyan('██╔═══╝ ██║   ██║██║╚██╔╝██║')}
${chalk.cyan('██║     ╚██████╔╝██║ ╚═╝ ██║')}
${chalk.cyan('╚═╝      ╚═════╝ ╚═╝     ╚═╝')}
`;

    const info = [
        [chalk.white('System'), chalk.blue('Volunteer OS / v1.0')],
        [chalk.white('Framework'), chalk.blue('FastAPI + Vanilla JS')],
        [chalk.white('Frontend'), frontendProcess ? chalk.green('● Operational') : chalk.red('○ Stopped')],
        [chalk.white('Backend'), backendProcess ? chalk.green('● Operational') : chalk.red('○ Stopped')],
        [chalk.white('Local URL'), chalk.cyan(`http://localhost:${CONFIG.FRONTEND_PORT}`)],
        [chalk.white('API URL'), chalk.cyan(`http://localhost:${CONFIG.BACKEND_PORT}`)],
        [chalk.white('Environment'), chalk.yellow('Development Team Build')],
        [chalk.white('Uptime'), chalk.gray(`${Math.floor((Date.now() - startTime) / 1000)}s`)]
    ];

    const table = new Table({
        chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
               , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
               , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
               , 'right': '' , 'right-mid': '' , 'middle': ' ' },
        style: { 'padding-left': 0, 'padding-right': 0 }
    });

    info.forEach(row => table.push(row));

    const content = `
${logo}
${chalk.white('Volunteer Management System')}
${chalk.gray('────────────────────────────────────')}
${table.toString()}
${chalk.gray('────────────────────────────────────')}
`;

    return boxen(content, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        float: 'left'
    });
}

function updateScreen() {
    if (isShuttingDown) return;
    process.stdout.write(CLEAR_SCREEN);
    console.log(getNeoFetch());
    console.log(`[ ${chalk.cyan('FRONTEND')} ] ● Running on localhost:${CONFIG.FRONTEND_PORT}`);
    console.log(`[ ${chalk.magenta('BACKEND ')} ] ● Running on localhost:${CONFIG.BACKEND_PORT}`);
    console.log(`\n${chalk.gray('Watching for changes...')}`);
    console.log(`${chalk.white('Press')} ${chalk.yellow('Q')} ${chalk.white('to quit')} | ${chalk.white('Press')} ${chalk.yellow('R')} ${chalk.white('to restart all')}`);
}

// --- SYSTEM LOGIC ---

async function checkPort(port) {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' 
            ? `netstat -ano | findstr :${port}` 
            : `lsof -i :${port}`;
        
        exec(cmd, (err, stdout) => {
            if (stdout && stdout.trim().length > 0) {
                const lines = stdout.trim().split('\n');
                if (process.platform === 'win32') {
                    // Filter lines to find LISTENING port
                    const listenLine = lines.find(l => l.includes('LISTENING'));
                    if (listenLine) {
                        const parts = listenLine.trim().split(/\s+/);
                        resolve(parts[parts.length - 1]); // PID
                    } else {
                        resolve(null);
                    }
                } else {
                    const parts = lines[1].trim().split(/\s+/);
                    resolve(parts[1]); // PID
                }
            } else {
                resolve(null);
            }
        });
    });
}

async function killProcess(pid) {
    if (!pid) return;
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
        exec(cmd, () => resolve());
    });
}

async function startFrontend() {
    const spinner = ora('Checking Frontend Port...').start();
    const pid = await checkPort(CONFIG.FRONTEND_PORT);
    if (pid) {
        spinner.text = `Killing existing Frontend process (PID: ${pid})...`;
        await killProcess(pid);
    }
    spinner.text = 'Starting Frontend Server...';

    frontendProcess = spawn('python', ['-m', 'http.server', CONFIG.FRONTEND_PORT.toString(), '-d', 'frontend'], {
        shell: true
    });

    frontendProcess.on('exit', (code) => {
        if (!isShuttingDown && code !== 0 && frontendProcess !== null) {
            console.log(chalk.red(`\n[WARN] Frontend stopped (Code: ${code})`));
            setTimeout(startFrontend, 3000);
        }
    });

    spinner.succeed(chalk.green('Frontend Online'));
    updateScreen();
}

async function startBackend() {
    const spinner = ora('Checking Backend Port...').start();
    const pid = await checkPort(CONFIG.BACKEND_PORT);
    if (pid) {
        spinner.text = `Killing existing Backend process (PID: ${pid})...`;
        await killProcess(pid);
    }
    spinner.text = 'Starting Backend API...';

    const fullCmd = `"${CONFIG.PYTHON_EXE}"${CONFIG.BACKEND_CMD}`;

    backendProcess = spawn(fullCmd, [], {
        shell: true,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    backendProcess.on('exit', (code) => {
        if (!isShuttingDown && code !== 0 && backendProcess !== null) {
            console.log(chalk.red(`\n[WARN] Backend stopped (Code: ${code}). Restarting in 5s...`));
            backendProcess = null;
            setTimeout(startBackend, 5000); // Slower restart
        }
    });

    // Wait for backend to be ready
    setTimeout(async () => {
        if (backendProcess) {
            spinner.succeed(chalk.green('Backend Online'));
            updateScreen();
            
            // ONLY OPEN BROWSER ONCE
            if (!browserOpened) {
                browserOpened = true;
                open(CONFIG.BROWSER_URL);
            }
        }
    }, 4000);
}

function stopAll() {
    isShuttingDown = true;
    console.log(chalk.yellow('\nShutting down services safely...'));
    
    if (frontendProcess) {
        frontendProcess.kill();
        frontendProcess = null;
    }
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
    
    setTimeout(() => {
        console.log(chalk.green('All services stopped. Goodbye.'));
        process.exit(0);
    }, 1000);
}

function restartAll() {
    console.log(chalk.cyan('\nRestarting all services...'));
    isShuttingDown = true;
    if (frontendProcess) frontendProcess.kill();
    if (backendProcess) backendProcess.kill();
    
    setTimeout(() => {
        isShuttingDown = false;
        launch();
    }, 2000);
}

// --- MAIN ---

async function launch() {
    startTime = Date.now();
    await startFrontend();
    await startBackend();
}

// Keyboard Interface
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') stopAll();
    if (key.name === 'q') stopAll();
    if (key.name === 'r') restartAll();
});

// Update timer every second
setInterval(() => {
    if (frontendProcess && backendProcess && !isShuttingDown) {
        updateScreen();
    }
}, 1000);

launch();
