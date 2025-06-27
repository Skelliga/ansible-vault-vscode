# CLI Transform VS Code Extension

This extension replaces the selected text in the active editor with the output of a CLI command. The selected text is piped to the command via `stdin` and the command's output replaces the original selection.

## Features
- Run a configurable CLI command on the selected text.
- Works with multiple selections.

## Configuration
- `cli-transform.command`: Command to run. The default is `rev`, which reverses the input text. The selected text is sent to the command on `stdin` and whatever the command prints to `stdout` replaces the selection.

## Usage
1. Select text in the editor.
2. Execute the `Transform Selection With CLI` command from the Command Palette or via keyboard shortcut if you assign one.

