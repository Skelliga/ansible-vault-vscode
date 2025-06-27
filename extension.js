const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let outputChannel;

function activate(context) {
    outputChannel = vscode.window.createOutputChannel('CLI Transform');
    context.subscriptions.push(outputChannel);
    let disposable = vscode.commands.registerCommand('cli-transform.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        const command = vscode.workspace.getConfiguration('cli-transform').get('command', 'rev');
        for (const selection of editor.selections) {
            const text = editor.document.getText(selection);
            const result = await runCli(command, text);
            if (result.code !== 0) {
                vscode.window.showErrorMessage(`Failed to run command: ${command}` + (result.stderr ? `\n${result.stderr}` : ''));
                return;
            }
            await editor.edit(edit => {
                edit.replace(selection, result.stdout);
            });
        }
    });
    context.subscriptions.push(disposable);

    let enc = vscode.commands.registerCommand('cli-transform.encryptVault', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        const passwordFile = vscode.workspace.getConfiguration('cli-transform').get('vaultPasswordFile', '');
        for (const selection of editor.selections) {
            const text = editor.document.getText(selection);
            const result = await encryptVault(text, passwordFile);
            if (result.code !== 0) {
                vscode.window.showErrorMessage('Failed to encrypt with ansible-vault' + (result.stderr ? `\n${result.stderr}` : ''));
                return;
            }
            await editor.edit(edit => edit.replace(selection, result.stdout));
        }
    });
    context.subscriptions.push(enc);

    let dec = vscode.commands.registerCommand('cli-transform.decryptVault', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        const passwordFile = vscode.workspace.getConfiguration('cli-transform').get('vaultPasswordFile', '');
        for (const selection of editor.selections) {
            const text = editor.document.getText(selection);
            const result = await decryptVault(text, passwordFile);
            if (result.code !== 0) {
                vscode.window.showErrorMessage('Failed to decrypt with ansible-vault' + (result.stderr ? `\n${result.stderr}` : ''));
                return;
            }
            await editor.edit(edit => edit.replace(selection, result.stdout));
        }
    });
    context.subscriptions.push(dec);
}

function runCli(command, input) {
    return new Promise(resolve => {
        console.log(`Running command: ${command}`);
        if (outputChannel) {
            outputChannel.appendLine(`Running command: ${command}`);
        }
        const child = spawn(command, { shell: true });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', data => stdout += data.toString());
        child.stderr.on('data', data => {
            const msg = data.toString();
            stderr += msg;
            console.error(msg);
            if (outputChannel) {
                outputChannel.appendLine(msg);
            }
        });
        child.on('error', err => {
            console.error('Failed to start process', err);
            if (outputChannel) {
                outputChannel.appendLine(`Failed to start process: ${err.message}`);
            }
            resolve({ stdout: '', stderr: err.message, code: -1 });
        });
        child.on('close', code => {
            console.log(`Command exited with code ${code}`);
            if (outputChannel) {
                outputChannel.appendLine(`Command exited with code ${code}`);
            }
            if (stderr && outputChannel) {
                outputChannel.appendLine(stderr);
            }
            resolve({ stdout, stderr, code });
        });
        if (input) {
            child.stdin.write(input);
        }
        child.stdin.end();
    });
}

async function encryptVault(text, passwordFile) {
    try {
        const tmp = path.join(os.tmpdir(), `vault-${Date.now()}`);
        await fs.promises.writeFile(tmp, text);
        console.log(`Encrypting selection with ansible-vault: ${tmp}`);
        if (outputChannel) {
            outputChannel.appendLine(`Encrypting selection with ansible-vault: ${tmp}`);
        }
        const pwOpt = passwordFile ? ` --vault-password-file ${passwordFile}` : '';
        const result = await runCli(`ansible-vault encrypt ${tmp}${pwOpt} --output -`);
        await fs.promises.unlink(tmp);
        return result;
    } catch (err) {
        console.error('encryptVault failed', err);
        if (outputChannel) {
            outputChannel.appendLine(`encryptVault failed: ${err.message}`);
        }
        return { stdout: '', stderr: err.message, code: -1 };
    }
}

async function decryptVault(text, passwordFile) {
    try {
        const cleaned = text
            .split(/\r?\n/)
            .map(line => line.trimStart())
            .join('\n');
        const tmp = path.join(os.tmpdir(), `vault-${Date.now()}`);
        await fs.promises.writeFile(tmp, cleaned);
        console.log(`Decrypting selection with ansible-vault: ${tmp}`);
        if (outputChannel) {
            outputChannel.appendLine(`Decrypting selection with ansible-vault: ${tmp}`);
        }
        const pwOpt = passwordFile ? ` --vault-password-file ${passwordFile}` : '';
        const result = await runCli(`ansible-vault decrypt ${tmp}${pwOpt} --output -`);
        await fs.promises.unlink(tmp);
        return result;
    } catch (err) {
        console.error('decryptVault failed', err);
        if (outputChannel) {
            outputChannel.appendLine(`decryptVault failed: ${err.message}`);
        }
        return { stdout: '', stderr: err.message, code: -1 };
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
