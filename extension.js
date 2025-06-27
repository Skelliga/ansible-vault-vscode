const vscode = require('vscode');
const { spawn } = require('child_process');

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
}

function runCli(command, input) {
    return new Promise(resolve => {
        const child = spawn(command, { shell: true });
        let output = '';
        child.stdout.on('data', data => output += data.toString());
        child.on('error', () => resolve(undefined));
        child.on('close', () => resolve(output));
        if (input) {
            child.stdin.write(input);
        }
        child.stdin.end();
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
