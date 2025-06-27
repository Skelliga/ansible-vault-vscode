const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('cli-transform.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        const command = vscode.workspace.getConfiguration('cli-transform').get('command', 'rev');
        for (const selection of editor.selections) {
            const text = editor.document.getText(selection);
            const output = await runCli(command, text);
            if (output === undefined) {
                vscode.window.showErrorMessage(`Failed to run command: ${command}`);
                return;
            }
            await editor.edit(edit => {
                edit.replace(selection, output);
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
        for (const selection of editor.selections) {
            const text = editor.document.getText(selection);
            const output = await encryptVault(text);
            if (output === undefined) {
                vscode.window.showErrorMessage('Failed to encrypt with ansible-vault');
                return;
            }
            await editor.edit(edit => edit.replace(selection, output));
        }
    });
    context.subscriptions.push(enc);

    let dec = vscode.commands.registerCommand('cli-transform.decryptVault', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        for (const selection of editor.selections) {
            const text = editor.document.getText(selection);
            const output = await decryptVault(text);
            if (output === undefined) {
                vscode.window.showErrorMessage('Failed to decrypt with ansible-vault');
                return;
            }
            await editor.edit(edit => edit.replace(selection, output));
        }
    });
    context.subscriptions.push(dec);
}

function runCli(command, input) {
    return new Promise(resolve => {
        console.log(`Running command: ${command}`);
        const child = spawn(command, { shell: true });
        let output = '';
        child.stdout.on('data', data => output += data.toString());
        child.stderr.on('data', data => console.error(data.toString()));
        child.on('error', () => resolve(undefined));
        child.on('close', () => resolve(output));
        if (input) {
            child.stdin.write(input);
        }
        child.stdin.end();
    });
}

async function encryptVault(text) {
    try {
        const tmp = path.join(os.tmpdir(), `vault-${Date.now()}`);
        await fs.promises.writeFile(tmp, text);
        console.log(`Encrypting selection with ansible-vault: ${tmp}`);
        const output = await runCli(`ansible-vault encrypt ${tmp} --output -`);
        await fs.promises.unlink(tmp);
        return output;
    } catch (err) {
        console.error('encryptVault failed', err);
        return undefined;
    }
}

async function decryptVault(text) {
    try {
        const tmp = path.join(os.tmpdir(), `vault-${Date.now()}`);
        await fs.promises.writeFile(tmp, text);
        console.log(`Decrypting selection with ansible-vault: ${tmp}`);
        const output = await runCli(`ansible-vault decrypt ${tmp} --output -`);
        await fs.promises.unlink(tmp);
        return output;
    } catch (err) {
        console.error('decryptVault failed', err);
        return undefined;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
